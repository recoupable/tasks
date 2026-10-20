import { mkdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { vi } from "vitest";
import type { Sandbox } from "@vercel/sandbox";
import { publicationFixture } from "./publicationFixture";

export function orgPublicationFixture(empty = false) {
  const fixture = publicationFixture(empty);
  const organizationId = "11111111-1111-4111-8111-111111111111";
  const repository = {
    id: 123,
    owner: "recoupable" as const,
    name: `org-team-${organizationId}`,
    url: `https://github.com/recoupable/org-team-${organizationId}`,
  };
  const home = join(realpathSync(fixture.root), "home");
  const root = join(home, ".openclaw/workspace/orgs");
  const workspace = join(root, "team");
  mkdirSync(root, { recursive: true });
  fixture.git(fixture.root, "clone", fixture.remote, workspace);
  fixture.git(workspace, "remote", "set-url", "origin", repository.url);
  const remotes = new Map([[repository.url, fixture.remote]]);
  const commands: {
    cmd: string;
    args: string[];
    cwd?: string;
    env?: Record<string, string>;
  }[] = [];
  const runCommand = vi.fn(async (command: (typeof commands)[number]) => {
    commands.push(command);
    if (command.cmd === "realpath") {
      try {
        const path = realpathSync(command.args.at(-1)!);
        return {
          exitCode: 0,
          stdout: async () => path + "\n",
          stderr: async () => "",
        };
      } catch {
        return {
          exitCode: 1,
          stdout: async () => "",
          stderr: async () => "missing",
        };
      }
    }
    let args = [...command.args];
    if (command.cmd === "git") {
      const operation = args[0] === "--git-dir" ? 2 : 0;
      if (["push", "ls-remote", "clone"].includes(args[operation])) {
        args = args.map((arg) => remotes.get(arg) ?? arg);
        if (args.includes("origin")) {
          const gitdir = args[0] === "--git-dir" ? args[1] : undefined;
          const url = fixture.git(
            command.cwd ?? fixture.worker,
            ...(gitdir ? ["--git-dir", gitdir] : []),
            "remote",
            "get-url",
            "origin",
          );
          if (!remotes.has(url))
            throw new Error("Unexpected synthetic destination");
          args = args.map((arg) =>
            arg === "origin" ? remotes.get(url)! : arg,
          );
        }
      }
    }
    const result = spawnSync(command.cmd, args, {
      cwd: command.cwd ?? fixture.worker,
      encoding: "utf8",
      timeout: 5_000,
      env: {
        PATH: process.env.PATH,
        ...command.env,
        GIT_ALLOW_PROTOCOL: "file",
      },
    });
    return {
      exitCode: result.status ?? 128,
      stdout: async () => result.stdout ?? "",
      stderr: async () => result.stderr ?? "",
    };
  });
  return {
    ...fixture,
    organizationId,
    repository,
    home,
    orgRoot: root,
    workspace,
    commands,
    runCommand,
    remotes,
    sandbox: { runCommand } as unknown as Sandbox,
  };
}
