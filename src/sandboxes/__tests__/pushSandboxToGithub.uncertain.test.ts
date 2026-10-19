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

it("keeps the local commit and never retries after a lost push acknowledgment", async () => {
  const f = publicationFixture();
  roots.push(f.root);
  f.race(() => {
    f.git(f.worker, "push", "origin", "HEAD:main");
    throw new Error("Synthetic reply lost after remote accepted commit");
  });
  expect(await pushSandboxToGithub(f.sandbox)).toBe(false);
  expect(f.git(f.remote, "rev-parse", "main")).toBe(
    f.git(f.worker, "rev-parse", "HEAD"),
  );
  expect(f.git(f.worker, "show", "HEAD:draft.txt")).toBe("worker replacement");
  expect(
    f.runCommand.mock.calls.filter(([call]) => call.args[0] === "push"),
  ).toHaveLength(1);
});

it("does not relax the original lease after a background tracking-ref fetch", async () => {
  const f = publicationFixture();
  roots.push(f.root);
  let newer = "";
  f.race(() => {
    newer = f.advancePeer();
    f.git(f.worker, "fetch", "origin");
  });
  expect(await pushSandboxToGithub(f.sandbox)).toBe(false);
  expect(f.git(f.remote, "rev-parse", "main")).toBe(newer);
  expect(f.git(f.worker, "rev-parse", "origin/main")).toBe(newer);
  expect(
    f.runCommand.mock.calls.filter(([call]) => call.args[0] === "push"),
  ).toHaveLength(1);
});

it("publishes the validated commit even if another local process moves HEAD", async () => {
  const f = publicationFixture();
  roots.push(f.root);
  const original = f.git(f.worker, "rev-parse", "HEAD");
  let validated = "";
  f.race(() => {
    validated = f.git(f.worker, "rev-parse", "HEAD");
    f.git(f.worker, "reset", "--hard", original);
  });
  expect(await pushSandboxToGithub(f.sandbox)).toBe(true);
  expect(f.git(f.remote, "rev-parse", "main")).toBe(validated);
  expect(f.git(f.remote, "show", "main:draft.txt")).toBe("worker replacement");
});
