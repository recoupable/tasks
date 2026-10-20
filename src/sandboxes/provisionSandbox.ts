import type { Sandbox } from "@vercel/sandbox";
import { installOpenClaw } from "./installOpenClaw";
import { setupOpenClaw } from "./setupOpenClaw";
import { ensureGithubRepo } from "./ensureGithubRepo";
import { writeReadme } from "./writeReadme";
import { ensureOrgRepos } from "./ensureOrgRepos";
import { ensureSetupSandbox } from "./ensureSetupSandbox";
import { pushSandboxToGithub } from "./pushSandboxToGithub";
import { pushOrgRepos } from "./git/pushOrgRepos";
import type { OrgPublicationBatch } from "./git/org/types";
import { logStep } from "./logStep";

interface ProvisionSandboxResult {
  githubRepo: string | undefined;
  githubPublished: boolean | null;
  organizations?: OrgPublicationBatch;
}

/**
 * Provisions a sandbox with the full Recoup environment:
 * OpenClaw CLI + gateway, GitHub repo, README, org repos, and folder structure.
 *
 * @param sandbox - The Vercel Sandbox instance
 * @param sandboxId - The sandbox identifier
 * @param accountId - The account ID that owns the sandbox
 * @returns The configured repository and whether its publication was confirmed
 */
export async function provisionSandbox(
  sandbox: Sandbox,
  sandboxId: string,
  accountId: string,
): Promise<ProvisionSandboxResult> {
  const plan = await ensureOrgRepos(sandbox, accountId);
  if (plan.issues.length) {
    logStep(
      "Organization publication binding unavailable; preserving recovery",
      false,
      { issues: plan.issues },
    );
    return {
      githubRepo: undefined,
      githubPublished: false,
      organizations: { ready: false, results: [], issues: plan.issues },
    };
  }
  await installOpenClaw(sandbox);
  await setupOpenClaw(sandbox, accountId);
  logStep("OpenClaw onboard complete, starting gateway");

  const githubRepo = await ensureGithubRepo(sandbox, accountId);
  logStep("GitHub repo ready");

  await writeReadme(sandbox, sandboxId, accountId, githubRepo ?? undefined);
  logStep("README written", false);

  try {
    await ensureSetupSandbox(sandbox, accountId);
  } catch (error) {
    logStep("ensureSetupSandbox failed, continuing with push", false, {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  logStep(
    githubRepo
      ? "Pushing to GitHub"
      : "No root repository configured; skipping root publication",
  );
  const organizations = await pushOrgRepos(sandbox, plan);
  if (!organizations.ready)
    return {
      githubRepo: githubRepo ?? undefined,
      githubPublished: false,
      organizations,
    };
  const githubPublished = githubRepo
    ? await pushSandboxToGithub(sandbox, organizations.results)
    : null;

  return {
    githubRepo: githubRepo ?? undefined,
    githubPublished,
    organizations,
  };
}
