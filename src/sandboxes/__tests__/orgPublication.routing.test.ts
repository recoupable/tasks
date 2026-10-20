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
it.each([false, true])(
  "denies separate or multiple push URLs (multiple=%s)",
  async (multiple) => {
    const plan = await ensureOrgRepos(f.sandbox, "account");
    if (multiple)
      f.git(
        f.workspace,
        "config",
        "--add",
        "remote.origin.pushurl",
        f.repository.url,
      );
    f.git(
      f.workspace,
      "config",
      "--add",
      "remote.origin.pushurl",
      "https://github.com/recoupable/unrelated",
    );
    expect((await pushOrgRepos(f.sandbox, plan)).results[0].state).toBe(
      "denied",
    );
    expect(f.commands.some((command) => command.args.includes("push"))).toBe(
      false,
    );
  },
);
it("does not publish annotated tags from source configuration", async () => {
  const plan = await ensureOrgRepos(f.sandbox, "account");
  f.git(f.workspace, "config", "push.followTags", "true");
  f.git(
    f.workspace,
    "-c",
    "user.name=Synthetic",
    "-c",
    "user.email=synthetic@example.invalid",
    "tag",
    "-a",
    "synthetic-tag",
    "-m",
    "tag",
  );
  expect((await pushOrgRepos(f.sandbox, plan)).ready).toBe(true);
  expect(f.git(f.root, "--git-dir", f.remote, "tag", "--list")).toBe("");
});
it("pins the captured commit even if local HEAD moves before push", async () => {
  const plan = await ensureOrgRepos(f.sandbox, "account");
  writeFileSync(join(f.workspace, "captured.txt"), "candidate A");
  const original = f.runCommand.getMockImplementation()!;
  f.runCommand.mockImplementation(async (command) => {
    if (command.args.includes("push")) {
      writeFileSync(join(f.workspace, "later.txt"), "candidate B");
      f.git(f.workspace, "add", "-A");
      f.git(
        f.workspace,
        "-c",
        "user.name=Synthetic",
        "-c",
        "user.email=synthetic@example.invalid",
        "commit",
        "-m",
        "later local work",
      );
    }
    return original(command);
  });
  const result = await pushOrgRepos(f.sandbox, plan);
  expect(result.ready).toBe(true);
  expect(f.git(f.root, "--git-dir", f.remote, "rev-parse", "main")).toBe(
    result.results[0].commitSha,
  );
  expect(f.git(f.workspace, "rev-parse", "HEAD")).not.toBe(
    result.results[0].commitSha,
  );
});
