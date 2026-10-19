import { beforeEach, expect, it, vi } from "vitest";
import { mockStop } from "./setupSandboxTask.fixture";
import { setupSandboxTask } from "../setupSandboxTask";
import { provisionSandbox } from "../../sandboxes/provisionSandbox";
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
  vi.mocked(snapshotAndPersist).mockRejectedValueOnce(
    new Error("Synthetic snapshot failure"),
  );
  await expect(run({ accountId: "acc_1" })).rejects.toThrow("sbx_123");
  expect(mockStop).not.toHaveBeenCalled();
});

it("preserves the recovery receipt error when shutdown also fails", async () => {
  vi.mocked(provisionSandbox).mockResolvedValueOnce({
    githubRepo: "https://github.com/org/repo",
    githubPublished: false,
  });
  mockStop.mockRejectedValueOnce(new Error("Synthetic stop failure"));
  await expect(run({ accountId: "acc_1" })).rejects.toThrow("snap_abc");
  expect(snapshotAndPersist).toHaveBeenCalledTimes(1);
  expect(mockStop).toHaveBeenCalledTimes(1);
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
