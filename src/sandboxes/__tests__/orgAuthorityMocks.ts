import { vi } from "vitest";
import { getAccountOrgs } from "../../recoup/getAccountOrgs";
import { createOrgGithubRepo } from "../../github/createOrgGithubRepo";
import { readOrgRepositoryAuthority } from "../../github/readOrgRepositoryAuthority";
import { getSandboxHomeDir } from "../getSandboxHomeDir";
import type { orgPublicationFixture } from "./orgPublication.fixture";
vi.mock("../../recoup/getAccountOrgs");
vi.mock("../../github/createOrgGithubRepo");
vi.mock("../../github/readOrgRepositoryAuthority");
vi.mock("../getSandboxHomeDir");
vi.mock("@trigger.dev/sdk", () => ({
  logger: { log: vi.fn(), error: vi.fn() },
}));
export function configureOrgAuthority(
  f: ReturnType<typeof orgPublicationFixture>,
) {
  vi.stubEnv("GITHUB_TOKEN", "synthetic-unused-token");
  vi.mocked(getAccountOrgs).mockResolvedValue([
    { organizationId: f.organizationId, organizationName: "Team" },
  ]);
  vi.mocked(createOrgGithubRepo).mockResolvedValue(f.repository.url);
  vi.mocked(readOrgRepositoryAuthority).mockResolvedValue(f.repository);
  vi.mocked(getSandboxHomeDir).mockResolvedValue(f.home);
}
