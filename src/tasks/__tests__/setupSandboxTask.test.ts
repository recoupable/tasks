import { describe, it, expect, vi, beforeEach } from "vitest";

import { mockStop } from "../../testing/setupSandboxTask.fixture";
const { setupSandboxTask } = await import("../setupSandboxTask");
const { getOrCreateSandbox } = await import(
  "../../sandboxes/getOrCreateSandbox"
);
const { provisionSandbox } = await import("../../sandboxes/provisionSandbox");
const { snapshotAndPersist } = await import(
  "../../sandboxes/snapshotAndPersist"
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("setupSandboxTask", () => {
  const run = setupSandboxTask.run;

  it("calls getOrCreateSandbox with accountId", async () => {
    await run({ accountId: "acc_1" });

    expect(getOrCreateSandbox).toHaveBeenCalledWith("acc_1");
  });

  it("calls provisionSandbox with sandbox, sandboxId, and accountId", async () => {
    await run({ accountId: "acc_1" });

    expect(provisionSandbox).toHaveBeenCalledWith(
      expect.objectContaining({ sandboxId: "sbx_123" }),
      "sbx_123",
      "acc_1",
    );
  });

  it("calls snapshotAndPersist with githubRepo from provisionSandbox", async () => {
    await run({ accountId: "acc_1" });

    expect(snapshotAndPersist).toHaveBeenCalledWith(
      expect.objectContaining({ sandboxId: "sbx_123" }),
      "acc_1",
      "https://github.com/org/repo",
    );
  });

  it("returns snapshotId and githubRepo on success", async () => {
    const result = await run({ accountId: "acc_1" });

    expect(result).toEqual({
      githubRepo: "https://github.com/org/repo",
      snapshotId: "snap_abc",
    });
  });

  it("stops the sandbox even when provisionSandbox throws", async () => {
    vi.mocked(provisionSandbox).mockRejectedValueOnce(new Error("boom"));

    await expect(run({ accountId: "acc_1" })).rejects.toThrow("boom");

    expect(mockStop).toHaveBeenCalled();
  });

  it("has maxDuration of 15 minutes", () => {
    expect(setupSandboxTask.maxDuration).toBe(60 * 15);
  });
  it("preserves a recovery snapshot before reporting unconfirmed publication", async () => {
    vi.mocked(provisionSandbox).mockResolvedValueOnce({
      githubRepo: "https://github.com/org/repo",
      githubPublished: false,
    });
    await expect(run({ accountId: "acc_1" })).rejects.toThrow("snap_abc");
    expect(snapshotAndPersist).toHaveBeenCalledTimes(1);
    expect(mockStop).toHaveBeenCalledTimes(1);
    expect(
      vi.mocked(snapshotAndPersist).mock.invocationCallOrder[0],
    ).toBeLessThan(mockStop.mock.invocationCallOrder[0]);
  });
});
