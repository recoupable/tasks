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

it("creates main only when its observed absence remains true", async () => {
  const f = publicationFixture(true);
  roots.push(f.root);
  expect(await pushSandboxToGithub(f.sandbox)).toBe(true);
  expect(f.git(f.remote, "show", "main:draft.txt")).toBe("worker replacement");
  expect(
    f.runCommand.mock.calls.find(([call]) => call.args[0] === "push")?.[0].args,
  ).toContain("--force-with-lease=refs/heads/main:");
});

it("does not replace main created after the missing-branch observation", async () => {
  const f = publicationFixture(true);
  roots.push(f.root);
  let newer = "";
  f.race(() => {
    newer = f.advancePeer();
  });
  expect(await pushSandboxToGithub(f.sandbox)).toBe(false);
  expect(f.git(f.remote, "rev-parse", "main")).toBe(newer);
  expect(f.git(f.worker, "show", "HEAD:draft.txt")).toBe("worker replacement");
});

it("never treats a remote read failure as a missing branch", async () => {
  const f = publicationFixture();
  roots.push(f.root);
  f.git(f.worker, "remote", "set-url", "origin", join(f.root, "missing.git"));
  expect(await pushSandboxToGithub(f.sandbox)).toBe(false);
  expect(
    f.runCommand.mock.calls.some(([call]) => call.args[0] === "push"),
  ).toBe(false);
  expect(f.git(f.worker, "show", "HEAD:draft.txt")).toBe("worker replacement");
  expect(readFileSync(join(f.worker, "draft.txt"), "utf8")).toBe(
    "worker replacement\n",
  );
});

it("publishes an existing local commit without making a second commit", async () => {
  const f = publicationFixture();
  roots.push(f.root);
  f.git(f.worker, "add", ".");
  f.git(f.worker, "commit", "-m", "local work");
  const head = f.git(f.worker, "rev-parse", "HEAD");
  expect(await pushSandboxToGithub(f.sandbox)).toBe(true);
  expect(f.git(f.worker, "rev-parse", "HEAD")).toBe(head);
  expect(f.git(f.remote, "rev-parse", "main")).toBe(head);
});
