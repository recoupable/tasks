import { beforeEach, expect, it, vi } from "vitest";
import { logger } from "@trigger.dev/sdk";
import { logSandboxGitFailure } from "../logSandboxGitFailure";
vi.mock("@trigger.dev/sdk", () => ({ logger: { error: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());
it.each([
  ["rejected (stale info)", "remote_changed"],
  [new Error("Authentication failed"), "authentication_or_access"],
  [new Error("command timed out"), "timeout_or_abort"],
  [new Error("unrecognized"), "command_or_transport_failure"],
])("records a bounded diagnostic category", (detail, category) => {
  logSandboxGitFailure("push", 1, detail);
  expect(logger.error).toHaveBeenCalledWith(expect.any(String), {
    stage: "push",
    exitCode: 1,
    category,
  });
});
it("never logs credential-bearing Git output or exception text", () => {
  const secret = "SYNTHETIC_CREDENTIAL_NOT_REAL";
  const detail = `Authentication failed for https://x-access-token:${secret}@github.com/example/private.git`;
  logSandboxGitFailure("observe_remote", 128, detail);
  logSandboxGitFailure("push", null, new Error(detail));
  const logged = JSON.stringify(vi.mocked(logger.error).mock.calls);
  expect(logged).not.toContain(secret);
  expect(logged).not.toContain("github.com");
  expect(logged).toContain("authentication_or_access");
});

it("identifies stale local history from ancestry exit 1 with empty stderr", () => {
  logSandboxGitFailure("check_ancestry", 1, "");
  expect(logger.error).toHaveBeenCalledWith(expect.any(String), {
    stage: "check_ancestry",
    exitCode: 1,
    category: "stale_local_history",
  });
});
