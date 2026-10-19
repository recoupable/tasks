import { beforeEach, expect, it, vi } from "vitest";
import { mockStop } from "./setupSandboxTask.fixture";
import { setupSandboxTask } from "../setupSandboxTask";
import { provisionSandbox } from "../../sandboxes/provisionSandbox";
import { logStep } from "../../sandboxes/logStep";
import { snapshotAndPersist } from "../../sandboxes/snapshotAndPersist";
const run = (
  setupSandboxTask as unknown as {
    run: (payload: { accountId: string }) => Promise<unknown>;
  }
).run;
beforeEach(() => {
  vi.clearAllMocks();
});

it("does not explicitly stop unpublished work after a recovery snapshot failure", async () => {
  vi.mocked(provisionSandbox).mockResolvedValueOnce({
    githubRepo: "https://github.com/org/repo",
    githubPublished: false,
  });
  const snapshotError = new Error("Synthetic snapshot failure");
  vi.mocked(snapshotAndPersist).mockRejectedValueOnce(snapshotError);
  await expect(run({ accountId: "acc_1" })).rejects.toMatchObject({
    message: expect.stringContaining("sbx_123"),
    cause: snapshotError,
  });
  expect(mockStop).not.toHaveBeenCalled();
});

it("preserves the recovery receipt error when shutdown also fails", async () => {
  vi.mocked(provisionSandbox).mockResolvedValueOnce({
    githubRepo: "https://github.com/org/repo",
    githubPublished: false,
  });
  mockStop.mockRejectedValueOnce(new Error("SYNTHETIC_CLEANUP_SECRET"));
  await expect(run({ accountId: "acc_1" })).rejects.toThrow("snap_abc");
  expect(snapshotAndPersist).toHaveBeenCalledTimes(1);
  expect(mockStop).toHaveBeenCalledTimes(1);
  expect(logStep).toHaveBeenCalledWith(
    "Sandbox shutdown also failed; preserving original task error",
    false,
    { sandboxId: "sbx_123", errorKind: "Error" },
  );
  expect(JSON.stringify(vi.mocked(logStep).mock.calls)).not.toContain(
    "SYNTHETIC_CLEANUP_SECRET",
  );
});

it("preserves successful standalone setup when Git publication is not applicable", async () => {
  vi.mocked(provisionSandbox).mockResolvedValueOnce({
    githubRepo: undefined,
    githubPublished: null,
  });
  await expect(run({ accountId: "acc_1" })).resolves.toEqual({
    githubRepo: null,
    snapshotId: "snap_abc",
  });
  expect(snapshotAndPersist).toHaveBeenCalledTimes(1);
  expect(mockStop).toHaveBeenCalledTimes(1);
});
