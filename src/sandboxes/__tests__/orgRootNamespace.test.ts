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
it.each([".openclaw/workspace/orgs", "./.openclaw/workspace/orgs"])(
  "rejects a module bound to the namespace root: %s",
  async (path) => {
    f = publicationFixture();
    const original = f.git(f.worker, "rev-parse", "HEAD");
    f.git(
      f.worker,
      "config",
      "-f",
      ".gitmodules",
      "submodule.namespace.path",
      path,
    );
    expect(await pushSandboxToGithub(f.sandbox, [])).toBe(false);
    expect(f.git(f.root, "--git-dir", f.remote, "rev-parse", "main")).toBe(
      original,
    );
  },
  30_000,
);
it("rejects a gitlink replacing the entire organization namespace", async () => {
  f = publicationFixture();
  const original = f.git(f.worker, "rev-parse", "HEAD");
  f.git(
    f.worker,
    "update-index",
    "--add",
    "--cacheinfo",
    `160000,${original},.openclaw/workspace/orgs`,
  );
  expect(await pushSandboxToGithub(f.sandbox, [])).toBe(false);
  expect(
    f.git(f.worker, "ls-files", "--stage", ".openclaw/workspace/orgs"),
  ).toContain(`160000 ${original}`);
  expect(f.git(f.root, "--git-dir", f.remote, "rev-parse", "main")).toBe(
    original,
  );
}, 30_000);
