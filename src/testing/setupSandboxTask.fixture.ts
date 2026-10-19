import { vi } from "vitest";
vi.mock("@trigger.dev/sdk/v3", () => ({
  logger: { log: vi.fn(), error: vi.fn() },
  schemaTask: vi.fn((config) => config),
}));

const mockStop = vi.fn().mockResolvedValue(undefined);

vi.mock("../sandboxes/getOrCreateSandbox", () => ({
  getOrCreateSandbox: vi.fn().mockResolvedValue({
    sandboxId: "sbx_123",
    sandbox: {
      sandboxId: "sbx_123",
      status: "running",
      stop: mockStop,
    },
  }),
}));

vi.mock("../sandboxes/logStep", () => ({
  logStep: vi.fn(),
}));

vi.mock("../sandboxes/provisionSandbox", () => ({
  provisionSandbox: vi.fn().mockResolvedValue({
    githubRepo: "https://github.com/org/repo",
    githubPublished: true,
  }),
}));

vi.mock("../sandboxes/snapshotAndPersist", () => ({
  snapshotAndPersist: vi.fn().mockResolvedValue({
    snapshotId: "snap_abc",
    expiresAt: new Date("2026-03-12"),
  }),
}));

export { mockStop };
