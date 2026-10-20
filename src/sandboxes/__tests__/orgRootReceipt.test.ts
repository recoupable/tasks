import { afterEach, expect, it, vi } from "vitest";
import { rmSync, writeFileSync, mkdirSync } from "node:fs";
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
it.each([false, true])(
  "publishes acknowledged SHA after local HEAD advances (populated=%s)",
  async (populated) => {
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
    const populatedPath = join(f.worker, ".openclaw/workspace/orgs/team");
    if (populated) {
      mkdirSync(join(f.worker, ".openclaw/workspace/orgs"), {
        recursive: true,
      });
      f.git(f.root, "clone", f.workspace, populatedPath);
      f.git(f.worker, "add", "-A");
    }
    const unpublished = f.git(f.workspace, "rev-parse", "HEAD");
    expect(await pushSandboxToGithub(f.sandbox, batch.results)).toBe(true);
    expect(f.git(f.workspace, "rev-parse", "HEAD")).toBe(unpublished);
    if (populated)
      expect(f.git(populatedPath, "rev-parse", "HEAD")).toBe(unpublished);
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
    // The next publication also validates the committed module blob and gitlink.
    expect(await pushSandboxToGithub(f.sandbox, batch.results)).toBe(true);
    if (populated)
      expect(f.git(populatedPath, "rev-parse", "HEAD")).toBe(unpublished);
  },
  30_000,
);
