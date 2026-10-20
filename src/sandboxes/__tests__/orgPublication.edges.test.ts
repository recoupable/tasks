import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { rmSync, writeFileSync, readFileSync } from "node:fs";
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
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});
it("supports a Git linked worktree with a .git file", async () => {
  rmSync(f.workspace, { recursive: true });
  f.git(f.worker, "remote", "set-url", "origin", f.repository.url);
  f.git(f.worker, "worktree", "add", "-b", "org-test", f.workspace, "HEAD");
  expect(readFileSync(join(f.workspace, ".git"), "utf8")).toContain("gitdir:");
  const plan = await ensureOrgRepos(f.sandbox, "account");
  expect(plan.issues).toEqual([]);
  expect((await pushOrgRepos(f.sandbox, plan)).ready).toBe(true);
});
it("uses clean transport even when the source checkout has a push rewrite", async () => {
  const plan = await ensureOrgRepos(f.sandbox, "account");
  const run = f.runCommand;
  const original = run.getMockImplementation()!;
  run.mockImplementation(async (command) => {
    if (command.args.includes("push"))
      f.git(
        f.workspace,
        "config",
        "url.https://github.com/recoupable/other.pushInsteadOf",
        f.repository.url,
      );
    return original(command);
  });
  writeFileSync(join(f.workspace, "new.txt"), "new work");
  expect((await pushOrgRepos(f.sandbox, plan)).ready).toBe(true);
  expect(f.git(f.root, "--git-dir", f.remote, "show", "main:new.txt")).toBe(
    "new work",
  );
});
it("keeps a lost acknowledgment unconfirmed and never retries", async () => {
  const plan = await ensureOrgRepos(f.sandbox, "account");
  writeFileSync(join(f.workspace, "new.txt"), "new work");
  const run = f.runCommand;
  const original = run.getMockImplementation()!;
  run.mockImplementation(async (command) => {
    const result = await original(command);
    return command.args.includes("push")
      ? {
          ...result,
          exitCode: 128,
          stderr: async () => "synthetic acknowledgment lost",
        }
      : result;
  });
  const batch = await pushOrgRepos(f.sandbox, plan);
  expect(batch.ready).toBe(false);
  expect(batch.results[0].state).toBe("unconfirmed");
  expect(f.commands.filter((c) => c.args.includes("push"))).toHaveLength(1);
  expect(f.git(f.root, "--git-dir", f.remote, "show", "main:new.txt")).toBe(
    "new work",
  );
});
it("never writes credentials to command arguments or Git config files", async () => {
  const plan = await ensureOrgRepos(f.sandbox, "account");
  expect((await pushOrgRepos(f.sandbox, plan)).ready).toBe(true);
  const argumentsText = JSON.stringify(f.commands.map((c) => c.args));
  expect(argumentsText).not.toContain("synthetic-unused-token");
  expect(argumentsText).not.toContain(
    Buffer.from("x-access-token:synthetic-unused-token").toString("base64"),
  );
  expect(readFileSync(join(f.workspace, ".git/config"), "utf8")).not.toContain(
    "Authorization",
  );
  const local = f.commands.filter(
    (c) => c.args.includes("add") || c.args.includes("commit"),
  );
  for (const command of local.filter((c) => c.args[0] === "-C")) {
    expect(command.env?.GIT_CONFIG_VALUE_0).toBe("");
    expect(command.env?.GITHUB_TOKEN).toBe("");
  }
});
