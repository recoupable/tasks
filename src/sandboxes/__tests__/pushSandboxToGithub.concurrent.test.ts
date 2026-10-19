import "./publicationMocks";
import { afterEach, expect, it } from "vitest";
import { rmSync } from "node:fs";
import { publicationFixture } from "./publicationFixture";
import { pushSandboxToGithub } from "../pushSandboxToGithub";
const roots: string[] = [];
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true })),
);

it("publishes normally with an explicit observed revision", async () => {
  const f = publicationFixture();
  roots.push(f.root);
  const original = f.git(f.remote, "rev-parse", "refs/heads/main");
  expect(await pushSandboxToGithub(f.sandbox)).toBe(true);
  expect(f.git(f.remote, "rev-parse", "refs/heads/main")).toBe(
    f.git(f.worker, "rev-parse", "HEAD"),
  );
  const pushes = f.runCommand.mock.calls.filter(
    ([call]) => call.args[0] === "push",
  );
  expect(pushes).toHaveLength(1);
  expect(pushes[0][0].args).toContain(
    `--force-with-lease=refs/heads/main:${original}`,
  );
});

it("preserves the newer remote and local commit when another writer wins", async () => {
  const f = publicationFixture();
  roots.push(f.root);
  let newer = "";
  f.race(() => {
    newer = f.advancePeer();
  });
  expect(await pushSandboxToGithub(f.sandbox)).toBe(false);
  expect(f.git(f.remote, "rev-parse", "refs/heads/main")).toBe(newer);
  expect(f.git(f.worker, "show", "HEAD:draft.txt")).toBe("worker replacement");
  expect(
    f.runCommand.mock.calls.filter(([call]) => call.args[0] === "push"),
  ).toHaveLength(1);
  expect(
    f.runCommand.mock.calls.some(([call]) =>
      ["fetch", "reset", "rebase"].includes(call.args[0]),
    ),
  ).toBe(false);
});

it("rejects an already stale sandbox even if its remote observation is fresh", async () => {
  const f = publicationFixture();
  roots.push(f.root);
  const newer = f.advancePeer();
  expect(await pushSandboxToGithub(f.sandbox)).toBe(false);
  expect(f.git(f.remote, "rev-parse", "refs/heads/main")).toBe(newer);
  expect(
    f.runCommand.mock.calls.some(([call]) => call.args[0] === "push"),
  ).toBe(false);
});
