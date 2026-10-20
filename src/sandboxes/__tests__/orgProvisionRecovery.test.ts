import { beforeEach, expect, it, vi } from "vitest";
import "./provisionSandbox.fixture";
import { provisionSandbox } from "../provisionSandbox";
import { ensureOrgRepos } from "../ensureOrgRepos";
import { setupOpenClaw } from "../setupOpenClaw";
import { installOpenClaw } from "../installOpenClaw";
import { pushOrgRepos } from "../git/pushOrgRepos";
import { pushSandboxToGithub } from "../pushSandboxToGithub";
import type { Sandbox } from "@vercel/sandbox";
const sandbox = {} as Sandbox;
beforeEach(() => vi.clearAllMocks());
it("captures bindings before delegated setup", async () => {
  await provisionSandbox(sandbox, "sandbox", "account");
  expect(vi.mocked(ensureOrgRepos).mock.invocationCallOrder[0]).toBeLessThan(
    vi.mocked(installOpenClaw).mock.invocationCallOrder[0],
  );
  expect(vi.mocked(ensureOrgRepos).mock.invocationCallOrder[0]).toBeLessThan(
    vi.mocked(setupOpenClaw).mock.invocationCallOrder[0],
  );
});
it("returns recovery status without running agents when a binding is missing", async () => {
  vi.mocked(ensureOrgRepos).mockResolvedValueOnce({
    accountId: "account",
    workspaceRoot: "",
    targets: [],
    issues: [{ reason: "membership_unavailable" }],
  });
  expect(
    (await provisionSandbox(sandbox, "sandbox", "account")).githubPublished,
  ).toBe(false);
  expect(installOpenClaw).not.toHaveBeenCalled();
  expect(setupOpenClaw).not.toHaveBeenCalled();
  expect(pushSandboxToGithub).not.toHaveBeenCalled();
});
it("does not publish root after an unconfirmed organization push", async () => {
  vi.mocked(pushOrgRepos).mockResolvedValueOnce({
    ready: false,
    results: [],
    issues: [{ reason: "transport_unconfirmed" }],
  });
  const result = await provisionSandbox(sandbox, "sandbox", "account");
  expect(result.githubPublished).toBe(false);
  expect(result.organizations?.issues[0].reason).toBe("transport_unconfirmed");
  expect(pushSandboxToGithub).not.toHaveBeenCalled();
});
