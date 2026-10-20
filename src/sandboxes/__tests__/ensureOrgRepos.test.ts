import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { rmSync, symlinkSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { orgPublicationFixture } from "./orgPublication.fixture";
import { ensureOrgRepos } from "../ensureOrgRepos";
import { getAccountOrgs } from "../../recoup/getAccountOrgs";
import { createOrgGithubRepo } from "../../github/createOrgGithubRepo";
import { readOrgRepositoryAuthority } from "../../github/readOrgRepositoryAuthority";
import { getSandboxHomeDir } from "../getSandboxHomeDir";
vi.mock("../../recoup/getAccountOrgs");
vi.mock("../../github/createOrgGithubRepo");
vi.mock("../../github/readOrgRepositoryAuthority");
vi.mock("../getSandboxHomeDir");
vi.mock("@trigger.dev/sdk", () => ({
  logger: { log: vi.fn(), error: vi.fn() },
}));
let f: ReturnType<typeof orgPublicationFixture>;
beforeEach(() => {
  vi.stubEnv("GITHUB_TOKEN", "synthetic-unused");
  f = orgPublicationFixture();
  vi.mocked(getSandboxHomeDir).mockResolvedValue(f.home);
  vi.mocked(createOrgGithubRepo).mockResolvedValue(f.repository.url);
  vi.mocked(readOrgRepositoryAuthority).mockResolvedValue(f.repository);
  vi.mocked(getAccountOrgs).mockResolvedValue([
    { organizationId: f.organizationId, organizationName: "Team" },
  ]);
});
afterEach(() => {
  rmSync(f.root, { recursive: true, force: true });
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});
it("rejects colliding display names before repository creation", async () => {
  vi.mocked(getAccountOrgs).mockResolvedValue([
    { organizationId: f.organizationId, organizationName: "Team A" },
    {
      organizationId: "22222222-2222-4222-8222-222222222222",
      organizationName: "Team / A",
    },
  ]);
  const plan = await ensureOrgRepos(f.sandbox, "account");
  expect(plan.issues[0].reason).toBe("ambiguous_organization_binding");
  expect(createOrgGithubRepo).not.toHaveBeenCalled();
  expect(f.commands).toEqual([]);
});
it("distinguishes unavailable membership from a known empty roster", async () => {
  vi.mocked(getAccountOrgs).mockResolvedValueOnce(undefined);
  expect((await ensureOrgRepos(f.sandbox, "account")).issues[0].reason).toBe(
    "membership_unavailable",
  );
  rmSync(f.workspace, { recursive: true });
  vi.mocked(getAccountOrgs).mockResolvedValueOnce([]);
  expect((await ensureOrgRepos(f.sandbox, "account")).issues).toEqual([]);
});
it("keeps unknown directories and refuses to infer access from them", async () => {
  mkdirSync(join(f.orgRoot, "unregistered"));
  expect((await ensureOrgRepos(f.sandbox, "account")).issues[0].reason).toBe(
    "unbound_workspace_entry",
  );
  expect(createOrgGithubRepo).not.toHaveBeenCalled();
});
it("rejects indirect workspace paths", async () => {
  rmSync(f.workspace, { recursive: true });
  symlinkSync(f.worker, f.workspace);
  expect((await ensureOrgRepos(f.sandbox, "account")).targets).toEqual([]);
});
it("retains unavailable provider authority as an issue", async () => {
  vi.mocked(readOrgRepositoryAuthority).mockResolvedValueOnce(undefined);
  const plan = await ensureOrgRepos(f.sandbox, "account");
  expect(plan.targets).toEqual([]);
  expect(plan.issues).toHaveLength(1);
});
