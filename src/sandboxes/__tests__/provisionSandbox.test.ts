import { describe, it, expect, vi, beforeEach } from "vitest";

import "./provisionSandbox.fixture";

const { provisionSandbox } = await import("../provisionSandbox");
const { installOpenClaw } = await import("../installOpenClaw");
const { setupOpenClaw } = await import("../setupOpenClaw");
const { ensureGithubRepo } = await import("../ensureGithubRepo");
const { writeReadme } = await import("../writeReadme");
const { ensureOrgRepos } = await import("../ensureOrgRepos");
const { ensureSetupSandbox } = await import("../ensureSetupSandbox");
const { pushSandboxToGithub } = await import("../pushSandboxToGithub");

const mockSandbox = {} as any;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("provisionSandbox", () => {
  it("calls all setup steps in order", async () => {
    const result = await provisionSandbox(mockSandbox, "sbx_123", "acc_456");

    expect(installOpenClaw).toHaveBeenCalledWith(mockSandbox);
    expect(setupOpenClaw).toHaveBeenCalledWith(mockSandbox, "acc_456");
    expect(ensureGithubRepo).toHaveBeenCalledWith(mockSandbox, "acc_456");
    expect(writeReadme).toHaveBeenCalledWith(
      mockSandbox,
      "sbx_123",
      "acc_456",
      "https://github.com/org/repo",
    );
    expect(ensureOrgRepos).toHaveBeenCalledWith(mockSandbox, "acc_456");
    expect(ensureSetupSandbox).toHaveBeenCalledWith(mockSandbox, "acc_456");
    expect(pushSandboxToGithub).toHaveBeenCalledWith(mockSandbox, []);
  });

  it("returns the github repo URL", async () => {
    const result = await provisionSandbox(mockSandbox, "sbx_123", "acc_456");
    expect(result.githubRepo).toBe("https://github.com/org/repo");
  });

  it("returns undefined githubRepo when ensureGithubRepo returns null", async () => {
    vi.mocked(ensureGithubRepo).mockResolvedValueOnce(null);
    const result = await provisionSandbox(mockSandbox, "sbx_123", "acc_456");
    expect(result.githubRepo).toBeUndefined();
  });

  it("still calls pushSandboxToGithub when ensureSetupSandbox throws", async () => {
    vi.mocked(ensureSetupSandbox).mockRejectedValueOnce(
      new Error("skill timeout"),
    );
    const result = await provisionSandbox(mockSandbox, "sbx_123", "acc_456");

    expect(pushSandboxToGithub).toHaveBeenCalledWith(mockSandbox, []);
    expect(result.githubRepo).toBe("https://github.com/org/repo");
  });
  it("propagates unconfirmed publication to the setup caller", async () => {
    vi.mocked(pushSandboxToGithub).mockResolvedValueOnce(false);
    const result = await provisionSandbox(mockSandbox, "sbx_123", "acc_456");
    expect(result.githubPublished).toBe(false);
  });
});
