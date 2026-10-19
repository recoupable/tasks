import { mkdirSync, renameSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { vi } from "vitest";
import type { Sandbox } from "@vercel/sandbox";
import { publicationFixture } from "../../src/sandboxes/__tests__/publicationFixture";

export function orgPublicationFixture() {
  const f = publicationFixture();
  const home = join(f.root, "home");
  const orgRoot = join(home, ".openclaw/workspace/orgs");
  mkdirSync(orgRoot, { recursive: true });
  const orgWork = join(orgRoot, "team-a");
  renameSync(f.worker, orgWork);
  const otherRemote = join(f.root, "outside-allowlist.git");
  f.git(f.root, "clone", "--bare", f.remote, otherRemote);
  const env = {
    PATH: process.env.PATH,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_ALLOW_PROTOCOL: "file",
    GIT_TERMINAL_PROMPT: "0",
  };
  const runCommand = vi.fn(
    async ({ cmd, args }: { cmd: string; args: string[] }) => {
      if (
        cmd !== "git" &&
        !(cmd === "sh" && args[1]?.startsWith(`find ${orgRoot} `))
      )
        throw new Error("Unexpected fixture command");
      const result = spawnSync(cmd, args, {
        cwd: orgWork,
        env,
        encoding: "utf8",
      });
      return {
        exitCode: result.status ?? 128,
        stdout: async () => result.stdout ?? "",
        stderr: async () => result.stderr ?? "",
      };
    },
  );
  return {
    root: f.root,
    remote: f.remote,
    otherRemote,
    orgWork,
    home,
    git: f.git,
    advancePeer: f.advancePeer,
    sandbox: { runCommand } as unknown as Sandbox,
  };
}
