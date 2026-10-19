import "./probeMocks";
import { afterEach, expect, it } from "vitest";
import { rmSync } from "node:fs";
import { readSandboxMainRevision } from "../../src/sandboxes/readSandboxMainRevision";
import { pushSandboxMainIfUnchanged } from "../../src/sandboxes/pushSandboxMainIfUnchanged";
import { orgPublicationFixture } from "./orgPublicationFixture";
const roots: string[] = [];
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true })),
);

it("COUNTEREXAMPLE: a fresh explicit lease validates revision but cannot authorize a retargeted repository", async () => {
  const f = orgPublicationFixture();
  roots.push(f.root);
  const allowedTip = f.git(f.remote, "rev-parse", "main");
  f.git(f.orgWork, "remote", "set-url", "origin", f.otherRemote);
  f.git(f.orgWork, "add", "-A");
  f.git(f.orgWork, "commit", "-m", "synthetic local work");
  const observed = await readSandboxMainRevision(f.sandbox);
  expect(observed?.sha).toBe(allowedTip);
  if (!observed) throw new Error("Synthetic observation failed");
  expect(await pushSandboxMainIfUnchanged(f.sandbox, observed)).toBe(true);
  expect(f.git(f.remote, "rev-parse", "main")).toBe(allowedTip);
  expect(f.git(f.otherRemote, "rev-parse", "main")).toBe(
    f.git(f.orgWork, "rev-parse", "HEAD"),
  );
  expect(fetch).not.toHaveBeenCalled();
});
