import { logger } from "@trigger.dev/sdk";

/** Git diagnostics can contain credential-bearing remote URLs; log categories only. */
export function logSandboxGitFailure(
  stage:
    | "prepare_root"
    | "observe_remote"
    | "identify_local"
    | "check_ancestry"
    | "push",
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
  let category = "command_or_transport_failure";
  if (stage === "check_ancestry" && exitCode === 1)
    category = "stale_local_history";
  else if (stage === "observe_remote" && (exitCode === 0 || exitCode === 2))
    category = "invalid_remote_observation";
  else if (/stale info|fetch first|non-fast-forward/.test(message))
    category = "remote_changed";
  else if (
    /authentication|permission denied|could not read username|403|401/.test(
      message,
    )
  )
    category = "authentication_or_access";
  else if (/timeout|abort|timed out/.test(message))
    category = "timeout_or_abort";
  logger.error("Sandbox Git publication stopped; local work retained", {
    stage,
    exitCode,
    category,
  });
}
