import { logger } from "@trigger.dev/sdk";
import type { Sandbox } from "@vercel/sandbox";
import { sanitizeRepoName } from "../../github/sanitizeRepoName";
import { getAccountOrgs } from "../../recoup/getAccountOrgs";
import { publishOrgTarget } from "./org/publishOrgTarget";
import { validateOrgWorkspaceEntries } from "./org/validateOrgWorkspaceEntries";
import type { OrgPublicationBatch, OrgPublicationPlan } from "./org/types";

/** A server-created plan is required; filesystem discovery never grants publication. */
export async function pushOrgRepos(
  sandbox: Sandbox,
  plan: OrgPublicationPlan,
): Promise<OrgPublicationBatch> {
  const batch: OrgPublicationBatch = {
    ready: false,
    results: [],
    issues: [...plan.issues],
  };
  if (batch.issues.length) return batch;
  try {
    const orgs = await getAccountOrgs(plan.accountId);
    if (!orgs) {
      batch.results = plan.targets.map((target) => ({
        target,
        state: "unconfirmed",
      }));
      logger.error("Organization membership unconfirmed", {
        accountId: plan.accountId,
      });
      batch.issues.push({ reason: "membership_unavailable" });
      return batch;
    }
    if (
      !(await validateOrgWorkspaceEntries(
        sandbox,
        plan.workspaceRoot,
        plan.targets.map((t) => t.alias),
      ))
    ) {
      batch.results = plan.targets.map((target) => ({
        target,
        state: "denied",
      }));
      logger.error("Organization workspace binding denied", {
        accountId: plan.accountId,
      });
      batch.issues.push({ reason: "unbound_workspace_entry" });
      return batch;
    }
    for (const target of plan.targets) {
      const authorized =
        target.accountId === plan.accountId &&
        target.workspaceRoot === plan.workspaceRoot &&
        target.repository.name ===
          `org-${target.alias}-${target.organizationId}`.toLowerCase() &&
        orgs.filter(
          (org) =>
            org.organizationId === target.organizationId &&
            sanitizeRepoName(org.organizationName) === target.alias &&
            org.organizationName.trim(),
        ).length === 1;
      batch.results.push(
        authorized
          ? await publishOrgTarget(sandbox, target)
          : { target, state: "denied" },
      );
    }
    logger.log("Organization publication outcomes", {
      accountId: plan.accountId,
      results: batch.results.map((result) => ({
        organizationId: result.target.organizationId,
        state: result.state,
        commitSha: result.commitSha,
      })),
    });
    batch.ready = batch.results.every((result) => result.state === "confirmed");
  } catch {
    logger.error("Organization publication unconfirmed", {
      accountId: plan.accountId,
      stage: "membership_or_workspace",
    });
    batch.issues.push({ reason: "organization_publication_unconfirmed" });
  }
  return batch;
}
