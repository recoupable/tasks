import { afterEach, expect, it, vi } from "vitest";
import { rmSync } from "node:fs";
import { publicationFixture } from "./publicationFixture";
import { pushSandboxToGithub } from "../pushSandboxToGithub";
vi.mock("../copyOpenClawToRepo", () => ({ copyOpenClawToRepo: vi.fn() }));
vi.mock("../git/stripGitmodulesTokens", () => ({
  stripGitmodulesTokens: vi.fn(),
}));
vi.mock("@trigger.dev/sdk", () => ({
  logger: { log: vi.fn(), error: vi.fn() },
}));
let f: ReturnType<typeof publicationFixture>;
afterEach(() => {
  if (f) rmSync(f.root, { recursive: true, force: true });
});
it("checks committed module metadata even after its file is staged for deletion", async () => {
  f = publicationFixture();
  const original = f.git(f.root, "--git-dir", f.remote, "rev-parse", "main");
  f.git(
    f.worker,
    "config",
    "-f",
    ".gitmodules",
    "submodule.hidden name.path",
    ".openclaw/workspace/orgs/unbound",
  );
  f.git(f.worker, "add", ".gitmodules");
  f.git(f.worker, "commit", "-m", "existing module declaration");
  const head = f.git(f.worker, "rev-parse", "HEAD");
  f.git(f.worker, "rm", "--", ".gitmodules");
  expect(await pushSandboxToGithub(f.sandbox, [])).toBe(false);
  expect(f.git(f.root, "--git-dir", f.remote, "rev-parse", "main")).toBe(
    original,
  );
  expect(f.git(f.worker, "rev-parse", "HEAD")).toBe(head);
  expect(f.git(f.worker, "diff", "--cached", "--name-status")).toContain(
    "D\t.gitmodules",
  );
}, 30_000);
