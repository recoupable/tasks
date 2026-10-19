import "./probeMocks";
import { afterEach, expect, it, vi } from "vitest";
import { rmSync } from "node:fs";
import { pushOrgRepos } from "../../src/sandboxes/git/pushOrgRepos";
import { getSandboxHomeDir } from "../../src/sandboxes/getSandboxHomeDir";
import { runOpenClawAgent } from "../../src/sandboxes/runOpenClawAgent";
import { orgPublicationFixture } from "./orgPublicationFixture";
const roots: string[] = [];
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true })),
);

it("COUNTEREXAMPLE: complying with the current delegated recipe overwrites a newer org tip", async () => {
  const f = orgPublicationFixture();
  roots.push(f.root);
  const newer = f.advancePeer();
  vi.mocked(getSandboxHomeDir).mockResolvedValue(f.home);
  vi.mocked(runOpenClawAgent).mockImplementation(async (_sandbox, options) => {
    expect(options.message).toContain("git push origin HEAD:main --force");
    // Deterministic stand-in obeys only the exact Git recipe emitted by the source.
    f.git(f.orgWork, "add", "-A");
    f.git(f.orgWork, "commit", "-m", "synthetic delegated work");
    f.git(f.orgWork, "push", "origin", "HEAD:main", "--force");
    return { exitCode: 0, stdout: "", stderr: "" };
  });
  await pushOrgRepos(f.sandbox);
  expect(f.git(f.remote, "rev-parse", "main")).not.toBe(newer);
  expect(
    f.git(f.remote, "ls-tree", "--name-only", "main").split("\n"),
  ).not.toContain("peer.txt");
  expect(f.git(f.remote, "show", "main:draft.txt")).toBe("worker replacement");
  expect(fetch).not.toHaveBeenCalled();
});

it("COUNTEREXAMPLE: discovery follows a folder's retargeted origin outside a synthetic allowlist", async () => {
  const f = orgPublicationFixture();
  roots.push(f.root);
  const allowedTip = f.git(f.remote, "rev-parse", "main");
  f.git(f.orgWork, "remote", "set-url", "origin", f.otherRemote);
  vi.mocked(getSandboxHomeDir).mockResolvedValue(f.home);
  vi.mocked(runOpenClawAgent).mockImplementation(async (_sandbox, options) => {
    expect(options.message).toContain("git push origin HEAD:main --force");
    f.git(f.orgWork, "add", "-A");
    f.git(f.orgWork, "commit", "-m", "synthetic delegated work");
    f.git(f.orgWork, "push", "origin", "HEAD:main", "--force");
    return { exitCode: 0, stdout: "", stderr: "" };
  });
  await pushOrgRepos(f.sandbox);
  expect(f.git(f.remote, "rev-parse", "main")).toBe(allowedTip);
  expect(f.git(f.otherRemote, "rev-parse", "main")).not.toBe(allowedTip);
  expect(f.git(f.otherRemote, "show", "main:draft.txt")).toBe(
    "worker replacement",
  );
  expect(fetch).not.toHaveBeenCalled();
});
