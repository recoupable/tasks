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
it("rejects unbound root gitlinks before staging can delete them", async () => {
  f = publicationFixture();
  const sha = f.git(f.worker, "rev-parse", "HEAD");
  f.git(
    f.worker,
    "update-index",
    "--add",
    "--cacheinfo",
    `160000,${sha},.openclaw/workspace/orgs/unbound`,
  );
  expect(await pushSandboxToGithub(f.sandbox, [])).toBe(false);
  expect(f.git(f.root, "--git-dir", f.remote, "rev-parse", "main")).toBe(sha);
  expect(
    f.git(f.worker, "ls-files", "--stage", ".openclaw/workspace/orgs/unbound"),
  ).toContain(`160000 ${sha}`);
  expect(
    f.runCommand.mock.calls.some(
      ([call]) => call.args[0] === "add" && call.args[1] === "-A",
    ),
  ).toBe(false);
}, 30_000);
it.each(["name with spaces", "name\twith\ttabs", 'name "quoted"'])(
  "rejects unbound module paths in a complex subsection name: %s",
  async (name) => {
    f = publicationFixture();
    const original = f.git(f.worker, "rev-parse", "HEAD");
    f.git(
      f.worker,
      "config",
      "-f",
      ".gitmodules",
      `submodule.${name}.path`,
      ".openclaw/workspace/orgs/unbound",
    );
    expect(await pushSandboxToGithub(f.sandbox, [])).toBe(false);
    expect(f.git(f.root, "--git-dir", f.remote, "rev-parse", "main")).toBe(
      original,
    );
  },
  30_000,
);
