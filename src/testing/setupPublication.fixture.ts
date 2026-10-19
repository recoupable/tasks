import "../sandboxes/__tests__/publicationMocks";
import { vi } from "vitest";
vi.mock("../sandboxes/installOpenClaw", () => ({
  installOpenClaw: vi.fn(),
}));
vi.mock("../sandboxes/setupOpenClaw", () => ({ setupOpenClaw: vi.fn() }));
vi.mock("../sandboxes/ensureGithubRepo", () => ({
  ensureGithubRepo: vi.fn(async () => "https://github.com/example/synthetic"),
}));
vi.mock("../sandboxes/writeReadme", () => ({ writeReadme: vi.fn() }));
vi.mock("../sandboxes/ensureOrgRepos", () => ({ ensureOrgRepos: vi.fn() }));
vi.mock("../sandboxes/ensureSetupSandbox", () => ({
  ensureSetupSandbox: vi.fn(),
}));
vi.mock("../sandboxes/logStep", () => ({ logStep: vi.fn() }));
vi.mock("../sandboxes/getOrCreateSandbox", () => ({
  getOrCreateSandbox: vi.fn(),
}));
vi.mock("../sandboxes/snapshotAndPersist", () => ({
  snapshotAndPersist: vi.fn(async () => ({
    snapshotId: "snap_synthetic_recovery",
  })),
}));
