import { logger } from "@trigger.dev/sdk";

/** Git diagnostics can contain credential-bearing remote URLs; log categories only. */
export function logSandboxGitFailure(
  stage: "observe_remote" | "identify_local" | "check_ancestry" | "push",
  exitCode: number | null,
  detail: unknown,
): void {
  const message = (
    detail instanceof Error
      ? detail.message
      : typeof detail === "string"
        ? detail
        : ""
  ).toLowerCase();
  const category = /stale info|fetch first|non-fast-forward/.test(message)
    ? "remote_changed"
    : /authentication|permission denied|could not read username|403|401/.test(
          message,
        )
      ? "authentication_or_access"
      : /timeout|abort|timed out/.test(message)
        ? "timeout_or_abort"
        : "command_or_transport_failure";
  logger.error("Sandbox Git publication stopped; local work retained", {
    stage,
    exitCode,
    category,
  });
}
