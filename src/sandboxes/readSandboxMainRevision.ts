import type { Sandbox } from "@vercel/sandbox";
import { logSandboxGitFailure } from "./logSandboxGitFailure";

/** null means observation failed; { sha: null } means main was absent. */
export async function readSandboxMainRevision(
  sandbox: Sandbox,
): Promise<{ sha: string | null } | null> {
  try {
    const result = await sandbox.runCommand({
      cmd: "git",
      args: [
        "ls-remote",
        "--exit-code",
        "--heads",
        "origin",
        "refs/heads/main",
      ],
    });
    const output = (await result.stdout()).trim();
    if (result.exitCode === 2 && !output) return { sha: null };
    const match = /^([a-f0-9]{40}|[a-f0-9]{64})\s+refs\/heads\/main$/.exec(
      output,
    );
    if (result.exitCode === 0 && match) return { sha: match[1] };
    logSandboxGitFailure(
      "observe_remote",
      result.exitCode,
      await result.stderr(),
    );
  } catch (error) {
    logSandboxGitFailure("observe_remote", null, error);
  }
  return null;
}
