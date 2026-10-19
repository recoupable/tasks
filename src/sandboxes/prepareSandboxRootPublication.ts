import type { Sandbox } from "@vercel/sandbox";
import { logger } from "@trigger.dev/sdk";
import { runGitCommand } from "./runGitCommand";
import { copyOpenClawToRepo } from "./copyOpenClawToRepo";
import { addOrgSubmodules } from "./git/addOrgSubmodules";
import { stripGitmodulesTokens } from "./git/stripGitmodulesTokens";
import { pushOrgRepos } from "./git/pushOrgRepos";

export async function prepareSandboxRootPublication(
  sandbox: Sandbox,
): Promise<boolean> {
  // Configure git user for commits
  if (
    !(await runGitCommand(
      sandbox,
      ["config", "user.email", "agent@recoupable.com"],
      "configure git email",
    ))
  ) {
    return false;
  }

  if (
    !(await runGitCommand(
      sandbox,
      ["config", "user.name", "Recoup Agent"],
      "configure git name",
    ))
  ) {
    return false;
  }

  // Push org repo changes to their remotes (simple OpenClaw prompt)
  await pushOrgRepos(sandbox);

  // Copy .openclaw (skip orgs/) into repo
  await copyOpenClawToRepo(sandbox);

  // Register org repos as submodules (deterministic)
  await addOrgSubmodules(sandbox);

  // Strip auth tokens from .gitmodules
  await stripGitmodulesTokens(sandbox);

  // Stage all files (.gitmodules + everything else)
  if (!(await runGitCommand(sandbox, ["add", "-A"], "stage files"))) {
    return false;
  }

  // Check if there are changes to commit
  const diffResult = await sandbox.runCommand({
    cmd: "git",
    args: ["diff", "--cached", "--quiet"],
  });

  if (diffResult.exitCode !== 0 && diffResult.exitCode !== 1) {
    logger.error("Cannot check staged changes; publication stopped", {
      exitCode: diffResult.exitCode,
    });
    return false;
  }
  if (diffResult.exitCode === 1) {
    // There are staged changes — commit them
    if (
      !(await runGitCommand(
        sandbox,
        ["commit", "-m", "Update sandbox files"],
        "commit changes",
      ))
    ) {
      return false;
    }
  }

  return true;
}
