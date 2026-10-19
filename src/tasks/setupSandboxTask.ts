import { schemaTask } from "@trigger.dev/sdk/v3";
import { getOrCreateSandbox } from "../sandboxes/getOrCreateSandbox";
import { logStep } from "../sandboxes/logStep";
import { cleanupSetupSandbox } from "../sandboxes/cleanupSetupSandbox";
import { snapshotAndPersist } from "../sandboxes/snapshotAndPersist";
import { provisionSandbox } from "../sandboxes/provisionSandbox";
import { setupSandboxPayloadSchema } from "../schemas/setupSandboxSchema";

/**
 * Background task that creates a personal Vercel Sandbox for an account,
 * fully provisions it (OpenClaw, GitHub repo, org repos, folder structure),
 * takes a snapshot, and shuts it down.
 */
export const setupSandboxTask = schemaTask({
  id: "setup-sandbox",
  schema: setupSandboxPayloadSchema,
  maxDuration: 60 * 15, // 15 minutes max to accommodate OpenClaw install
  retry: {
    maxAttempts: 0, // Zero retries — run once only
  },
  run: async (payload) => {
    const { accountId } = payload;

    logStep("Starting sandbox setup", true, { accountId });

    const { sandboxId, sandbox } = await getOrCreateSandbox(accountId);

    let safeToStop = true;
    let operationFailed = false;
    try {
      logStep("Provisioning sandbox");
      const { githubRepo, githubPublished } = await provisionSandbox(
        sandbox,
        sandboxId,
        accountId,
      );
      logStep("Provisioning complete", false);

      safeToStop = githubPublished !== false;
      logStep("Taking snapshot");
      const snapshotResult = await snapshotAndPersist(
        sandbox,
        accountId,
        githubRepo,
      ).catch((error: unknown) => {
        if (githubPublished === false) {
          throw new Error(
            `Git publication and recovery snapshot are unconfirmed. Preserve sandbox ${sandboxId} for recovery; no explicit shutdown attempted.`,
            { cause: error },
          );
        }
        throw error;
      });
      safeToStop = true;

      if (githubPublished === false) {
        throw new Error(
          `Git publication was not confirmed. Unpublished work retained in recovery snapshot ${snapshotResult.snapshotId}; reconcile before publishing again.`,
        );
      }

      logStep("Sandbox setup complete", true, {
        sandboxId: sandbox.name,
        githubRepo: githubRepo ?? null,
        snapshotId: snapshotResult.snapshotId,
      });

      return {
        githubRepo: githubRepo ?? null,
        snapshotId: snapshotResult.snapshotId,
      };
    } catch (error) {
      operationFailed = true;
      throw error;
    } finally {
      await cleanupSetupSandbox(
        sandbox,
        sandboxId,
        safeToStop,
        operationFailed,
      );
    }
  },
});
