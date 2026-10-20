import "../../testing/setupPublication.fixture";
import { expect, it, vi } from "vitest";
import type { Sandbox } from "@vercel/sandbox";
import { getOrCreateSandbox } from "../../sandboxes/getOrCreateSandbox";
import { snapshotAndPersist } from "../../sandboxes/snapshotAndPersist";
import { pushOrgRepos } from "../../sandboxes/git/pushOrgRepos";
import { setupSandboxTask } from "../setupSandboxTask";
it("snapshots before stopping after an organization publication failure", async () => {
  const stop = vi.fn();
  const sandbox = { stop } as unknown as Sandbox;
  vi.mocked(getOrCreateSandbox).mockResolvedValue({
    sandboxId: "synthetic",
    sandbox,
  });
  vi.mocked(pushOrgRepos).mockResolvedValueOnce({
    ready: false,
    results: [],
    issues: [{ reason: "synthetic_push_unconfirmed" }],
  });
  const run = (
    setupSandboxTask as unknown as {
      run: (input: { accountId: string }) => Promise<unknown>;
    }
  ).run;
  await expect(run({ accountId: "synthetic" })).rejects.toThrow(
    "snap_synthetic_recovery",
  );
  expect(snapshotAndPersist).toHaveBeenCalledTimes(1);
  expect(
    vi.mocked(snapshotAndPersist).mock.invocationCallOrder[0],
  ).toBeLessThan(stop.mock.invocationCallOrder[0]);
});
