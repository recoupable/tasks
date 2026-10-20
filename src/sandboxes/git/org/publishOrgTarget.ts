import { logger } from "@trigger.dev/sdk";
import type { Sandbox } from "@vercel/sandbox";
import { posix } from "node:path";
import { readOrgRepositoryAuthority } from "../../../github/readOrgRepositoryAuthority";
import { readOrgWorkspaceIdentity } from "./readOrgWorkspaceIdentity";
import { commitOrgCandidate } from "./commitOrgCandidate";
import { pushOrgCandidate } from "./pushOrgCandidate";
import type { OrgPublicationResult, OrgPublicationTarget } from "./types";

export async function publishOrgTarget(
  sandbox: Sandbox,
  target: OrgPublicationTarget,
): Promise<OrgPublicationResult> {
  let state: OrgPublicationResult["state"] = "denied";
  let commitSha: string | undefined;
  try {
    if (
      posix.join(target.workspaceRoot, target.alias) !== target.workspacePath ||
      !/^[a-z0-9-]+$/.test(target.alias)
    )
      return { target, state };
    const root = await sandbox.runCommand({
      cmd: "realpath",
      args: ["-e", "--", target.workspaceRoot],
    });
    if (
      root.exitCode !== 0 ||
      (await root.stdout()).trim() !== target.workspaceRoot
    )
      return { target, state };
    const authority = await readOrgRepositoryAuthority(target.repository.name);
    if (!authority) return { target, state: "unconfirmed" };
    if (
      authority.id !== target.repository.id ||
      authority.url !== target.repository.url
    )
      return { target, state };
    const identity = await readOrgWorkspaceIdentity(
      sandbox,
      target.workspacePath,
      target.repository.url,
    );
    if (
      identity.gitDirectory !== target.gitDirectory ||
      identity.objectDirectory !== target.objectDirectory
    )
      return { target, state };
    state = "unconfirmed";
    commitSha = await commitOrgCandidate(sandbox, target.workspacePath);
    if (!commitSha) return { target, state };
    state = await pushOrgCandidate(sandbox, target, commitSha);
    return { target, state, commitSha };
  } catch {
    logger.error("Organization target publication stopped", {
      organizationId: target.organizationId,
      state,
    });
    return { target, state, commitSha };
  }
}
