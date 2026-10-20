import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mkdirSync, rmSync, renameSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { orgPublicationFixture } from "./orgPublication.fixture";
import { configureOrgAuthority } from "./orgAuthorityMocks";
import { createOrgGithubRepo } from "../../github/createOrgGithubRepo";
import { getAccountOrgs } from "../../recoup/getAccountOrgs";
import { ensureOrgRepos } from "../ensureOrgRepos";
import { pushOrgRepos } from "../git/pushOrgRepos";
let f: ReturnType<typeof orgPublicationFixture>;
beforeEach(() => {
  f = orgPublicationFixture();
  configureOrgAuthority(f);
});
afterEach(() => {
  if (f) rmSync(f.root, { recursive: true, force: true });
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});
it("retains unavailable membership as scoped uncertainty", async () => {
  const plan = await ensureOrgRepos(f.sandbox, "account");
  vi.mocked(getAccountOrgs).mockResolvedValueOnce(undefined);
  const batch = await pushOrgRepos(f.sandbox, plan);
  expect(batch.ready).toBe(false);
  expect(batch.results[0]).toMatchObject({
    target: plan.targets[0],
    state: "unconfirmed",
  });
  expect(batch.issues).toEqual([{ reason: "membership_unavailable" }]);
});
it("denies an observed unbound directory without publishing", async () => {
  const plan = await ensureOrgRepos(f.sandbox, "account");
  mkdirSync(join(f.orgRoot, "unbound"));
  const batch = await pushOrgRepos(f.sandbox, plan);
  expect(batch.ready).toBe(false);
  expect(batch.results[0].state).toBe("denied");
  expect(batch.issues).toEqual([{ reason: "unbound_workspace_entry" }]);
  expect(
    f.commands.some(
      (command) =>
        command.args.includes("push") || command.args.includes("commit"),
    ),
  ).toBe(false);
});
it("retains target uncertainty when the membership SDK throws", async () => {
  const plan = await ensureOrgRepos(f.sandbox, "account");
  vi.mocked(getAccountOrgs).mockRejectedValueOnce(
    new Error("synthetic unavailable"),
  );
  const batch = await pushOrgRepos(f.sandbox, plan);
  expect(batch.ready).toBe(false);
  expect(batch.results[0].state).toBe("unconfirmed");
  expect(batch.issues).toEqual([
    { reason: "organization_publication_unconfirmed" },
  ]);
});
it("rejects a symlinked workspace root before scanning entries", async () => {
  const plan = await ensureOrgRepos(f.sandbox, "account");
  const retained = join(f.home, "retained-orgs");
  renameSync(f.orgRoot, retained);
  symlinkSync(retained, f.orgRoot);
  const offset = f.commands.length;
  const batch = await pushOrgRepos(f.sandbox, plan);
  expect(batch.ready).toBe(false);
  expect(batch.results[0].state).toBe("denied");
  expect(
    f.commands.slice(offset).some((command) => command.cmd === "find"),
  ).toBe(false);
});

it("retains a failed planner workspace scan as unconfirmed", async () => {
  const original = f.runCommand.getMockImplementation()!;
  f.runCommand.mockImplementation(async (command) =>
    command.cmd === "find"
      ? {
          exitCode: 1,
          stdout: async () => "",
          stderr: async () => "synthetic enumeration failed",
        }
      : original(command),
  );
  const plan = await ensureOrgRepos(f.sandbox, "account");
  expect(plan.issues).toEqual([{ reason: "workspace_scan_unconfirmed" }]);
  expect(plan.targets).toEqual([]);
  expect(createOrgGithubRepo).not.toHaveBeenCalled();
});
