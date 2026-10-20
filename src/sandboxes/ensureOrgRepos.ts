import { logger } from "@trigger.dev/sdk";
import { OrgBindingError } from "./git/org/OrgBindingError";
import type { Sandbox } from "@vercel/sandbox";
import { posix } from "node:path";
import { z } from "zod";
import { getAccountOrgs } from "../recoup/getAccountOrgs";
import { sanitizeRepoName } from "../github/sanitizeRepoName";
import { getSandboxHomeDir } from "./getSandboxHomeDir";
import { prepareOrgPublicationTarget } from "./git/org/prepareOrgPublicationTarget";
import { validateOrgWorkspaceEntries } from "./git/org/validateOrgWorkspaceEntries";
import type { OrgPublicationPlan } from "./git/org/types";

/** Authority and observed versions are captured before any delegated setup work. */
export async function ensureOrgRepos(
  sandbox: Sandbox,
  accountId: string,
): Promise<OrgPublicationPlan> {
  const plan: OrgPublicationPlan = {
    accountId,
    workspaceRoot: "",
    targets: [],
    issues: [],
  };
  let stage = "membership";
  try {
    const orgs = await getAccountOrgs(accountId);
    if (!orgs) {
      plan.issues.push({ reason: "membership_unavailable" });
      return plan;
    }
    const aliases = orgs.map((org) => sanitizeRepoName(org.organizationName));
    const ids = new Set<string>();
    for (const [index, org] of orgs.entries()) {
      if (
        !z.string().uuid().safeParse(org.organizationId).success ||
        !org.organizationName.trim() ||
        ids.has(org.organizationId) ||
        aliases.filter((alias) => alias === aliases[index]).length !== 1
      ) {
        plan.issues.push({
          organizationId: org.organizationId,
          reason: "ambiguous_organization_binding",
        });
      }
      ids.add(org.organizationId);
    }
    if (plan.issues.length) return plan;
    stage = "workspace_root";
    const home = await getSandboxHomeDir(sandbox);
    if (!home.startsWith("/") || /[\x00-\x1f:]/.test(home))
      throw new Error("Invalid workspace home");
    const root = posix.join(home, ".openclaw/workspace/orgs");
    const made = await sandbox.runCommand({
      cmd: "mkdir",
      args: ["-p", "--", root],
    });
    const physical = await sandbox.runCommand({
      cmd: "realpath",
      args: ["-e", "--", root],
    });
    if (
      made.exitCode !== 0 ||
      physical.exitCode !== 0 ||
      (await physical.stdout()).trim() !== root
    )
      throw new Error("Indirect organization workspace");
    plan.workspaceRoot = root;
    const workspace = await validateOrgWorkspaceEntries(sandbox, root, aliases);
    if (workspace !== "valid") {
      plan.issues.push({
        reason:
          workspace === "unbound"
            ? "unbound_workspace_entry"
            : "workspace_scan_unconfirmed",
      });
      return plan;
    }
    for (const org of orgs) {
      try {
        plan.targets.push(
          await prepareOrgPublicationTarget(sandbox, accountId, org, root),
        );
      } catch (error) {
        const reason =
          error instanceof OrgBindingError
            ? error.reason
            : "target_binding_unavailable";
        plan.issues.push({
          organizationId: org.organizationId,
          reason,
        });
      }
    }
  } catch {
    logger.error("Organization setup unconfirmed", { accountId, stage });
    plan.issues.push({ reason: "organization_setup_unconfirmed" });
  }
  return plan;
}
