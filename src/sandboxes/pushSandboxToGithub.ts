import type { OrgPublicationResult } from "./git/org/types";
import type { Sandbox } from "@vercel/sandbox";
import { logger } from "@trigger.dev/sdk";
import { readSandboxMainRevision } from "./readSandboxMainRevision";
import { pushSandboxMainIfUnchanged } from "./pushSandboxMainIfUnchanged";
import { prepareSandboxRootPublication } from "./prepareSandboxRootPublication";
import { logSandboxGitFailure } from "./logSandboxGitFailure";

/** Conflicts and preparation failures keep local work for caller recovery. */
export async function pushSandboxToGithub(
  sandbox: Sandbox,
  organizations: OrgPublicationResult[],
): Promise<boolean> {
  try {
    logger.log("Pushing sandbox files to GitHub");
    if (!(await prepareSandboxRootPublication(sandbox, organizations)))
      return false;
    const observed = await readSandboxMainRevision(sandbox);
    if (!observed) return false;
    if (!(await pushSandboxMainIfUnchanged(sandbox, observed))) return false;
    logger.log("Sandbox files pushed to GitHub successfully");
    return true;
  } catch (error) {
    logSandboxGitFailure("prepare_root", null, error);
    return false;
  }
}
