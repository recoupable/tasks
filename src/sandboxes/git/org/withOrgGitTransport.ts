import type { Sandbox } from "@vercel/sandbox";
import type { GitCommandRunner } from "../../GitCommandRunner";
import type { OrgRepository } from "./types";
import { normalizeOrgRepositoryUrl } from "./normalizeOrgRepositoryUrl";
import { orgGitEnvironment } from "./orgGitEnvironment";
import { logger } from "@trigger.dev/sdk";

/** Isolated, temporary Git config: sandbox origin/URL rewrites cannot choose the destination. */
export async function withOrgGitTransport<T>(
  sandbox: Sandbox,
  repository: OrgRepository,
  objects: string | undefined,
  action: (runner: GitCommandRunner, directory: string) => Promise<T>,
): Promise<T> {
  if (
    repository.owner !== "recoupable" ||
    !Number.isSafeInteger(repository.id) ||
    repository.id <= 0 ||
    repository.url !== `https://github.com/recoupable/${repository.name}` ||
    normalizeOrgRepositoryUrl(repository.url) !== repository.url
  )
    throw new Error("Invalid organization transport binding");
  const env = orgGitEnvironment(objects);
  const made = await sandbox.runCommand({
    cmd: "mktemp",
    args: ["-d", "/tmp/recoup-org-git.XXXXXXXX"],
  });
  const directory = (await made.stdout()).trim();
  if (
    made.exitCode !== 0 ||
    !/^\/tmp\/recoup-org-git\.[a-zA-Z0-9]+$/.test(directory)
  )
    throw new Error("Temporary Git transport unavailable");
  const runner: GitCommandRunner = {
    runCommand: async ({ args }) =>
      sandbox.runCommand({
        cmd: "git",
        args: ["--git-dir", directory, ...args],
        cwd: directory,
        env,
      }),
  };
  try {
    const initialized = await runner.runCommand({
      cmd: "git",
      args: ["init", "--bare", "--template="],
    });
    if (initialized.exitCode !== 0)
      throw new Error("Temporary Git initialization failed");
    const remote = await runner.runCommand({
      cmd: "git",
      args: ["remote", "add", "origin", repository.url],
    });
    if (remote.exitCode !== 0)
      throw new Error("Organization Git destination unavailable");
    return await action(runner, directory);
  } finally {
    try {
      await sandbox.runCommand({ cmd: "rm", args: ["-rf", "--", directory] });
    } catch {
      logger.error("Temporary organization Git cleanup failed");
    }
  }
}
