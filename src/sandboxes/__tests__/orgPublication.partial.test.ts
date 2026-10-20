import { afterEach, expect, it, vi } from "vitest";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { orgPublicationFixture } from "./orgPublication.fixture";
import { configureOrgAuthority } from "./orgAuthorityMocks";
import { getAccountOrgs } from "../../recoup/getAccountOrgs";
import { createOrgGithubRepo } from "../../github/createOrgGithubRepo";
import { readOrgRepositoryAuthority } from "../../github/readOrgRepositoryAuthority";
import { ensureOrgRepos } from "../ensureOrgRepos";
import { pushOrgRepos } from "../git/pushOrgRepos";
let f: ReturnType<typeof orgPublicationFixture>;
afterEach(() => {
  if (f) rmSync(f.root, { recursive: true, force: true });
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
it("retains confirmed and conflicted outcomes separately without retrying", async () => {
  f = orgPublicationFixture();
  configureOrgAuthority(f);
  const id = "22222222-2222-4222-8222-222222222222";
  const second = {
    ...f.repository,
    id: 456,
    name: `org-second-${id}`,
    url: `https://github.com/recoupable/org-second-${id}`,
  };
  const remote = join(f.root, "second.git"),
    workspace = join(f.root, "second");
  f.git(f.root, "clone", "--bare", f.remote, remote);
  f.git(f.root, "clone", remote, workspace);
  // The authorized folder is established before the setup plan is captured.
  const bound = join(f.home, ".openclaw/workspace/orgs/second");
  f.git(f.root, "clone", remote, bound);
  f.git(bound, "remote", "set-url", "origin", second.url);
  f.remotes.set(second.url, remote);
  vi.mocked(getAccountOrgs).mockResolvedValue([
    { organizationId: f.organizationId, organizationName: "Team" },
    { organizationId: id, organizationName: "Second" },
  ]);
  vi.mocked(createOrgGithubRepo).mockImplementation(async (_name, org) =>
    org === id ? second.url : f.repository.url,
  );
  vi.mocked(readOrgRepositoryAuthority).mockImplementation(async (name) =>
    name === second.name ? second : f.repository,
  );
  const plan = await ensureOrgRepos(f.sandbox, "account");
  expect(plan.issues).toEqual([]);
  f.advancePeer();
  writeFileSync(join(bound, "new.txt"), "second new work");
  const batch = await pushOrgRepos(f.sandbox, plan);
  expect(batch.ready).toBe(false);
  expect(batch.results.map((result) => result.state)).toEqual([
    "conflict",
    "confirmed",
  ]);
  expect(f.git(f.root, "--git-dir", remote, "show", "main:new.txt")).toBe(
    "second new work",
  );
  expect(
    f.commands.filter((command) => command.args.includes("push")),
  ).toHaveLength(2);
});
