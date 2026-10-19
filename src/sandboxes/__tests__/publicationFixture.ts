import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { vi } from "vitest";
import type { Sandbox } from "@vercel/sandbox";

export function publicationFixture(empty = false) {
  const root = mkdtempSync(join(tmpdir(), "recoup-publication-"));
  const remote = join(root, "remote.git");
  const worker = join(root, "worker");
  const peer = join(root, "peer");
  const env = {
    PATH: process.env.PATH,
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_ALLOW_PROTOCOL: "file",
    GIT_TERMINAL_PROMPT: "0",
  };
  const git = (cwd: string, ...args: string[]) =>
    execFileSync("git", args, {
      cwd,
      env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  git(root, "init", "--bare", "--initial-branch=main", remote);
  git(root, "clone", remote, worker);
  git(worker, "config", "user.name", "Synthetic Worker");
  git(worker, "config", "user.email", "synthetic@example.invalid");
  if (!empty) {
    writeFileSync(join(worker, "draft.txt"), "original\n");
    git(worker, "add", ".");
    git(worker, "commit", "-m", "original");
    git(worker, "push", "origin", "HEAD:main");
  }
  git(root, "clone", remote, peer);
  git(peer, "config", "user.name", "Synthetic Peer");
  git(peer, "config", "user.email", "synthetic@example.invalid");
  const advancePeer = () => {
    writeFileSync(join(peer, "peer.txt"), "newer remote work\n");
    git(peer, "add", ".");
    git(peer, "commit", "-m", "peer work");
    git(peer, "push", "origin", "HEAD:main");
    return git(peer, "rev-parse", "HEAD");
  };
  let beforePush: (() => void) | undefined;
  const runCommand = vi.fn(
    async ({ cmd, args }: { cmd: string; args: string[] }) => {
      if (args[0] === "push") {
        const action = beforePush;
        beforePush = undefined;
        action?.();
      }
      const result = spawnSync(cmd, args, {
        cwd: worker,
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
  const sandbox = { runCommand } as unknown as Sandbox;
  writeFileSync(join(worker, "draft.txt"), "worker replacement\n");
  return {
    root,
    worker,
    remote,
    git,
    runCommand,
    sandbox,
    advancePeer,
    race: (action: () => void) => {
      beforePush = action;
    },
  };
}
