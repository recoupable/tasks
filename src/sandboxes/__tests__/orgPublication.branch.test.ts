import { afterEach, expect, it, vi } from "vitest";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { orgPublicationFixture } from "./orgPublication.fixture";
import { configureOrgAuthority } from "./orgAuthorityMocks";
import { ensureOrgRepos } from "../ensureOrgRepos";
import { pushOrgRepos } from "../git/pushOrgRepos";
let f: ReturnType<typeof orgPublicationFixture>;
afterEach(() => {
  if (f) rmSync(f.root, { recursive: true, force: true });
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});
it("creates a branch only against captured confirmed absence", async () => {
  f = orgPublicationFixture(true);
  configureOrgAuthority(f);
  const plan = await ensureOrgRepos(f.sandbox, "account");
  expect(plan.issues).toEqual([]);
  expect(plan.targets[0].observedSha).toBeNull();
  writeFileSync(join(f.workspace, "initial.txt"), "first org commit");
  expect((await pushOrgRepos(f.sandbox, plan)).ready).toBe(true);
});
it("does not replace main created after the absence observation", async () => {
  f = orgPublicationFixture(true);
  configureOrgAuthority(f);
  const plan = await ensureOrgRepos(f.sandbox, "account");
  const winner = f.advancePeer();
  writeFileSync(join(f.workspace, "initial.txt"), "preserve local candidate");
  const batch = await pushOrgRepos(f.sandbox, plan);
  expect(batch.ready).toBe(false);
  expect(batch.results[0].state).toBe("conflict");
  expect(f.git(f.root, "--git-dir", f.remote, "rev-parse", "main")).toBe(
    winner,
  );
});
it("never treats an unknown remote read as absence", async () => {
  f = orgPublicationFixture();
  configureOrgAuthority(f);
  const original = f.runCommand.getMockImplementation()!;
  f.runCommand.mockImplementation(async (command) =>
    command.args.includes("ls-remote")
      ? {
          exitCode: 128,
          stdout: async () => "",
          stderr: async () => "synthetic transport failure",
        }
      : original(command),
  );
  const plan = await ensureOrgRepos(f.sandbox, "account");
  expect(plan.targets).toEqual([]);
  expect(plan.issues[0].reason).toBe("remote_revision_unavailable");
});
