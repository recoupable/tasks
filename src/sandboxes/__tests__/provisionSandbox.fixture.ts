import { vi } from "vitest";
vi.mock("@trigger.dev/sdk/v3", () => ({
  logger: { log: vi.fn(), error: vi.fn() },
  metadata: { set: vi.fn(), append: vi.fn() },
}));

vi.mock("../installOpenClaw", () => ({
  installOpenClaw: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../setupOpenClaw", () => ({
  setupOpenClaw: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../ensureGithubRepo", () => ({
  ensureGithubRepo: vi.fn().mockResolvedValue("https://github.com/org/repo"),
}));

vi.mock("../writeReadme", () => ({
  writeReadme: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../ensureOrgRepos", () => ({
  ensureOrgRepos: vi.fn().mockResolvedValue({
    accountId: "acc_456",
    workspaceRoot: "/synthetic",
    targets: [],
    issues: [],
  }),
}));

vi.mock("../ensureSetupSandbox", () => ({
  ensureSetupSandbox: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../pushSandboxToGithub", () => ({
  pushSandboxToGithub: vi.fn().mockResolvedValue(true),
}));

vi.mock("../git/pushOrgRepos", () => ({
  pushOrgRepos: vi
    .fn()
    .mockResolvedValue({ ready: true, results: [], issues: [] }),
}));
