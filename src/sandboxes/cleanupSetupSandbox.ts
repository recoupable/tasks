import type { Sandbox } from "@vercel/sandbox";
import { logStep } from "./logStep";

export async function cleanupSetupSandbox(
  sandbox: Sandbox,
  sandboxId: string,
  safeToStop: boolean,
  operationFailed: boolean,
): Promise<void> {
  if (!safeToStop) {
    logStep("Recovery unconfirmed; skipping explicit sandbox shutdown", false, {
      sandboxId,
    });
    return;
  }
  try {
    logStep("Stopping sandbox", false, { sandboxId });
    await sandbox.stop();
  } catch (error) {
    if (!operationFailed) throw error;
    const errorKind =
      error instanceof Error &&
      ["Error", "AbortError", "TimeoutError"].includes(error.name)
        ? error.name
        : "UnknownError";
    logStep(
      "Sandbox shutdown also failed; preserving original task error",
      false,
      { sandboxId, errorKind },
    );
  }
}
