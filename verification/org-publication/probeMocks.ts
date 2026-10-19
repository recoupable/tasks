import { beforeEach, afterEach, vi } from "vitest";
vi.mock("@trigger.dev/sdk/v3", () => ({
  logger: { log: vi.fn(), error: vi.fn() },
}));
vi.mock("@trigger.dev/sdk", () => ({
  logger: { log: vi.fn(), error: vi.fn() },
}));
vi.mock("../../src/sandboxes/getSandboxHomeDir", () => ({
  getSandboxHomeDir: vi.fn(),
}));
vi.mock("../../src/sandboxes/runOpenClawAgent", () => ({
  runOpenClawAgent: vi.fn(),
}));
vi.mock("../../src/recoup/getAccountOrgs", () => ({ getAccountOrgs: vi.fn() }));
vi.mock("../../src/github/createOrgGithubRepo", () => ({
  createOrgGithubRepo: vi.fn(),
}));
vi.mock("../../src/sandboxes/logStep", () => ({ logStep: vi.fn() }));
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("GITHUB_TOKEN", "synthetic-unused-token");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("No hosted HTTP allowed in publication probes");
    }),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
