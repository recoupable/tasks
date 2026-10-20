import { afterEach, expect, it, vi } from "vitest";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { orgPublicationFixture } from "./orgPublication.fixture";
import { configureOrgAuthority } from "./orgAuthorityMocks";
import { ensureOrgRepos } from "../ensureOrgRepos";
import { pushOrgRepos } from "../git/pushOrgRepos";
import { pushSandboxToGithub } from "../pushSandboxToGithub";
vi.mock("../copyOpenClawToRepo", () => ({ copyOpenClawToRepo: vi.fn() }));
vi.mock("../git/stripGitmodulesTokens", () => ({
  stripGitmodulesTokens: vi.fn(),
}));
let f: ReturnType<typeof orgPublicationFixture>;
afterEach(() => {
  rmSync(f.root, { recursive: true, force: true });
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});
it("publishes the acknowledged organization SHA even after its local HEAD advances", async () => {
  f = orgPublicationFixture();
  configureOrgAuthority(f);
  const rootRemote = join(f.root, "root.git");
  f.git(f.root, "clone", "--bare", f.remote, rootRemote);
  f.git(f.worker, "remote", "set-url", "origin", rootRemote);
  f.remotes.set(rootRemote, rootRemote);
  const plan = await ensureOrgRepos(f.sandbox, "account");
  writeFileSync(join(f.workspace, "accepted.txt"), "accepted org work");
  const batch = await pushOrgRepos(f.sandbox, plan);
  expect(batch.ready).toBe(true);
  writeFileSync(join(f.workspace, "later.txt"), "unpublished org work");
  f.git(f.workspace, "add", "-A");
  f.git(
    f.workspace,
    "-c",
    "user.name=Synthetic",
    "-c",
    "user.email=synthetic@example.invalid",
    "commit",
    "-m",
    "unpublished local work",
  );
  expect(await pushSandboxToGithub(f.sandbox, batch.results)).toBe(true);
  const tree = f.git(
    f.root,
    "--git-dir",
    rootRemote,
    "ls-tree",
    "main",
    ".openclaw/workspace/orgs/team",
  );
  expect(tree).toContain(`160000 commit ${batch.results[0].commitSha}`);
  expect(tree).not.toContain(f.git(f.workspace, "rev-parse", "HEAD"));
  const modules = f.git(
    f.root,
    "--git-dir",
    rootRemote,
    "show",
    "main:.gitmodules",
  );
  expect(modules).toContain(f.repository.url);
}, 30_000);
