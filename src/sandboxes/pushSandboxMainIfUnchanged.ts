import type { Sandbox } from "@vercel/sandbox";
import { logger } from "@trigger.dev/sdk";

/** One push against the original observation; no fetch, reset or retry. */
export async function pushSandboxMainIfUnchanged(
  sandbox: Sandbox,
  observed: { sha: string | null },
): Promise<boolean> {
  try {
    const local = await sandbox.runCommand({
      cmd: "git",
      args: ["rev-parse", "--verify", "HEAD^{commit}"],
    });
    const candidate = (await local.stdout()).trim();
    if (
      local.exitCode !== 0 ||
      !/^([a-f0-9]{40}|[a-f0-9]{64})$/.test(candidate)
    ) {
      logger.error(
        "Cannot identify local publication commit; no push attempted.",
      );
      return false;
    }
    if (observed.sha) {
      const ancestry = await sandbox.runCommand({
        cmd: "git",
        args: ["merge-base", "--is-ancestor", observed.sha, candidate],
      });
      if (ancestry.exitCode !== 0) {
        logger.error(
          "Local work does not include observed remote main; publication stopped.",
        );
        return false;
      }
    }
    const result = await sandbox.runCommand({
      cmd: "git",
      args: [
        "push",
        `--force-with-lease=refs/heads/main:${observed.sha ?? ""}`,
        "origin",
        `${candidate}:refs/heads/main`,
      ],
    });
    if (result.exitCode === 0) return true;
  } catch {
    // Unknown outcomes retain local work too; never retry with a newer tip.
  }
  logger.error(
    "Git publication not confirmed; local commits kept. Reconcile before retrying.",
  );
  return false;
}
