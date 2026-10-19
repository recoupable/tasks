import { vi, expect, it } from "vitest";
import type { Sandbox } from "@vercel/sandbox";
import { readSandboxMainRevision } from "../readSandboxMainRevision";
vi.mock("@trigger.dev/sdk", () => ({ logger: { error: vi.fn() } }));

it.each([
  [0, ""],
  [128, ""],
  [1, ""],
  [2, "unexpected output"],
  [0, `${"a".repeat(40)}\trefs/heads/other`],
  [0, `not-a-revision\trefs/heads/main`],
  [0, `${"a".repeat(40)}\trefs/heads/main\n${"b".repeat(40)}\trefs/heads/main`],
])(
  "fails closed for exit %s and malformed/failed remote output",
  async (exitCode, output) => {
    const runCommand = vi.fn(async () => ({
      exitCode,
      stdout: async () => output,
      stderr: async () => "Synthetic command error",
    }));
    expect(
      await readSandboxMainRevision({ runCommand } as unknown as Sandbox),
    ).toBeNull();
    expect(runCommand).toHaveBeenCalledTimes(1);
  },
);

it("returns no observation when the SDK transport throws", async () => {
  const runCommand = vi
    .fn()
    .mockRejectedValue(new Error("Synthetic transport failure"));
  expect(
    await readSandboxMainRevision({ runCommand } as unknown as Sandbox),
  ).toBeNull();
});
