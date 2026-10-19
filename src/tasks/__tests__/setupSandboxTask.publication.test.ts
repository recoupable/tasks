import "../../testing/setupPublication.fixture";
import { afterEach, expect, it, vi } from "vitest";
import { rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Sandbox } from "@vercel/sandbox";
import { publicationFixture } from "../../sandboxes/__tests__/publicationFixture";
import { getOrCreateSandbox } from "../../sandboxes/getOrCreateSandbox";
import { snapshotAndPersist } from "../../sandboxes/snapshotAndPersist";
import { setupSandboxTask } from "../setupSandboxTask";
const roots: string[] = [];
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true })),
);
it("routes a real publisher preparation exception through task snapshot recovery", async () => {
  const f = publicationFixture();
  roots.push(f.root);
  const original = f.runCommand.getMockImplementation()!;
  f.runCommand.mockImplementation(async (call) => {
    if (call.args[0] === "diff") throw new Error("Synthetic SDK diff failure");
    return original(call);
  });
  const stop = vi.fn(async () => {});
  const sandbox = { runCommand: f.runCommand, stop } as unknown as Sandbox;
  vi.mocked(getOrCreateSandbox).mockResolvedValue({
    sandboxId: "sbx_synthetic",
    sandbox,
  });
  const run = (
    setupSandboxTask as unknown as {
      run: (payload: { accountId: string }) => Promise<unknown>;
    }
  ).run;
  await expect(run({ accountId: "synthetic_actor" })).rejects.toThrow(
    "snap_synthetic_recovery",
  );
  expect(snapshotAndPersist).toHaveBeenCalledTimes(1);
  expect(snapshotAndPersist).toHaveBeenCalledWith(
    sandbox,
    "synthetic_actor",
    "https://github.com/example/synthetic",
  );
  expect(stop).toHaveBeenCalledTimes(1);
  expect(
    vi.mocked(snapshotAndPersist).mock.invocationCallOrder[0],
  ).toBeLessThan(stop.mock.invocationCallOrder[0]);
  expect(readFileSync(join(f.worker, "draft.txt"), "utf8")).toBe(
    "worker replacement\n",
  );
  expect(
    f.runCommand.mock.calls.some(([call]) => call.args[0] === "push"),
  ).toBe(false);
});
