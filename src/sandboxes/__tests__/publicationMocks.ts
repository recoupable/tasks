import { vi } from "vitest";
vi.mock("@trigger.dev/sdk/v3", () => ({
  logger: { log: vi.fn(), error: vi.fn() },
  schemaTask: vi.fn((config) => config),
}));
vi.mock("../copyOpenClawToRepo", () => ({ copyOpenClawToRepo: vi.fn() }));
vi.mock("../git/addOrgSubmodules", () => ({ addOrgSubmodules: vi.fn() }));
vi.mock("../git/stripGitmodulesTokens", () => ({
  stripGitmodulesTokens: vi.fn(),
}));
vi.mock("../git/pushOrgRepos", () => ({ pushOrgRepos: vi.fn() }));

vi.mock("@trigger.dev/sdk", () => ({
  logger: { log: vi.fn(), error: vi.fn() },
  schemaTask: vi.fn((config) => config),
}));
