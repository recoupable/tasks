import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { rmSync, writeFileSync, symlinkSync, renameSync } from "node:fs";
import { join } from "node:path";
import { orgPublicationFixture } from "./orgPublication.fixture";
import { configureOrgAuthority } from "./orgAuthorityMocks";
import { ensureOrgRepos } from "../ensureOrgRepos";
import { pushOrgRepos } from "../git/pushOrgRepos";
let f: ReturnType<typeof orgPublicationFixture>;
beforeEach(() => {
  f = orgPublicationFixture();
  configureOrgAuthority(f);
});
afterEach(() => {
  rmSync(f.root, { recursive: true, force: true });
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});
it("rejects a changed physical directory without deleting the original work", async () => {
  const plan = await ensureOrgRepos(f.sandbox, "account");
  const retained = join(f.root, "retained");
  renameSync(f.workspace, retained);
  symlinkSync(retained, f.workspace);
  expect((await pushOrgRepos(f.sandbox, plan)).results[0].state).toBe("denied");
  expect(f.git(retained, "rev-parse", "HEAD")).toBe(
    plan.targets[0].observedSha,
  );
});
it("denies a plan retargeted to a different account", async () => {
  const plan = await ensureOrgRepos(f.sandbox, "account");
  plan.accountId = "another-account";
  expect((await pushOrgRepos(f.sandbox, plan)).results[0].state).toBe("denied");
});
