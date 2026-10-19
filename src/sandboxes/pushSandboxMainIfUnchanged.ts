import type { Sandbox } from "@vercel/sandbox";
import { logSandboxGitFailure } from "./logSandboxGitFailure";

/** One push against the original observation; no fetch, reset or retry. */
export async function pushSandboxMainIfUnchanged(
  sandbox: Sandbox,
  observed: { sha: string | null },
): Promise<boolean> {
  let stage: Parameters<typeof logSandboxGitFailure>[0] = "identify_local";
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
      logSandboxGitFailure(stage, local.exitCode, await local.stderr());
      return false;
    }
    if (observed.sha) {
      stage = "check_ancestry";
      const ancestry = await sandbox.runCommand({
        cmd: "git",
        args: ["merge-base", "--is-ancestor", observed.sha, candidate],
      });
      if (ancestry.exitCode !== 0) {
        logSandboxGitFailure(stage, ancestry.exitCode, await ancestry.stderr());
        return false;
      }
    }
    stage = "push";
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
    logSandboxGitFailure(stage, result.exitCode, await result.stderr());
  } catch (error) {
    logSandboxGitFailure(stage, null, error);
  }
  return false;
}
