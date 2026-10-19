import "./publicationMocks";
import { afterEach, expect, it } from "vitest";
import { rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { publicationFixture } from "./publicationFixture";
import { pushSandboxToGithub } from "../pushSandboxToGithub";
const roots: string[] = [];
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true })),
);
it("returns unconfirmed publication when staged diff throws, preserving local work", async () => {
  const f = publicationFixture();
  roots.push(f.root);
  const original = f.runCommand.getMockImplementation()!;
  f.runCommand.mockImplementation(async (call) => {
    if (call.args[0] === "diff")
      throw new Error("Synthetic SDK transport failure");
    return original(call);
  });
  await expect(pushSandboxToGithub(f.sandbox)).resolves.toBe(false);
  expect(readFileSync(join(f.worker, "draft.txt"), "utf8")).toBe(
    "worker replacement\n",
  );
  expect(
    f.runCommand.mock.calls.some(([call]) => call.args[0] === "push"),
  ).toBe(false);
});
