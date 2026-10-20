import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { orgPublicationFixture } from "./orgPublication.fixture";
import { ensureOrgRepos } from "../ensureOrgRepos";
import { pushOrgRepos } from "../git/pushOrgRepos";
import { getAccountOrgs } from "../../recoup/getAccountOrgs";
import { readOrgRepositoryAuthority } from "../../github/readOrgRepositoryAuthority";
import { createOrgGithubRepo } from "../../github/createOrgGithubRepo";
import { getSandboxHomeDir } from "../getSandboxHomeDir";
vi.mock("../../recoup/getAccountOrgs");
vi.mock("../../github/readOrgRepositoryAuthority");
vi.mock("../../github/createOrgGithubRepo");
vi.mock("../getSandboxHomeDir");
vi.mock("@trigger.dev/sdk", () => ({
  logger: { log: vi.fn(), error: vi.fn() },
}));
describe("bound organization publication", () => {
  let f: ReturnType<typeof orgPublicationFixture>;
  beforeEach(() => {
    vi.stubEnv("GITHUB_TOKEN", "synthetic-unused-token");
    f = orgPublicationFixture();
    vi.mocked(getAccountOrgs).mockResolvedValue([
      { organizationId: f.organizationId, organizationName: "Team" },
    ]);
    vi.mocked(createOrgGithubRepo).mockResolvedValue(f.repository.url);
    vi.mocked(readOrgRepositoryAuthority).mockResolvedValue(f.repository);
    vi.mocked(getSandboxHomeDir).mockResolvedValue(f.home);
  });
  afterEach(() => {
    rmSync(f.root, { recursive: true, force: true });
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });
  it("publishes a captured candidate to its authorized repository", async () => {
    const plan = await ensureOrgRepos(f.sandbox, "account");
    expect(plan.issues).toEqual([]);
    writeFileSync(join(f.workspace, "new.txt"), "new work");
    const result = await pushOrgRepos(f.sandbox, plan);
    expect(result.ready).toBe(true);
    expect(result.results[0].state).toBe("confirmed");
    expect(f.git(f.root, "--git-dir", f.remote, "rev-parse", "main")).toBe(
      result.results[0].commitSha,
    );
  });
  it("preserves newer remote work and the local candidate", async () => {
    const plan = await ensureOrgRepos(f.sandbox, "account");
    const peer = f.advancePeer();
    writeFileSync(join(f.workspace, "new.txt"), "recover me");
    const result = await pushOrgRepos(f.sandbox, plan);
    expect(result.ready).toBe(false);
    expect(f.git(f.root, "--git-dir", f.remote, "rev-parse", "main")).toBe(
      peer,
    );
    expect(f.git(f.workspace, "show", "HEAD:new.txt")).toBe("recover me");
  });
  it("denies retargeted origins before any push", async () => {
    const plan = await ensureOrgRepos(f.sandbox, "account");
    f.git(
      f.workspace,
      "remote",
      "set-url",
      "origin",
      "https://github.com/recoupable/other",
    );
    const result = await pushOrgRepos(f.sandbox, plan);
    expect(result.results[0].state).toBe("denied");
    expect(f.commands.some((c) => c.args.includes("push"))).toBe(false);
  });
  it("denies revoked membership and replaced provider identity", async () => {
    const plan = await ensureOrgRepos(f.sandbox, "account");
    vi.mocked(getAccountOrgs).mockResolvedValue([]);
    expect((await pushOrgRepos(f.sandbox, plan)).ready).toBe(false);
    vi.mocked(getAccountOrgs).mockResolvedValue([
      { organizationId: f.organizationId, organizationName: "Team" },
    ]);
    vi.mocked(readOrgRepositoryAuthority).mockResolvedValue({
      ...f.repository,
      id: 999,
    });
    expect((await pushOrgRepos(f.sandbox, plan)).results[0].state).toBe(
      "denied",
    );
  });
});
