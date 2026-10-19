import "./probeMocks";
import { expect, it, vi } from "vitest";
import type { Sandbox } from "@vercel/sandbox";
import { logger } from "@trigger.dev/sdk/v3";
import { ensureOrgRepos } from "../../src/sandboxes/ensureOrgRepos";
import { pushOrgRepos } from "../../src/sandboxes/git/pushOrgRepos";
import { getAccountOrgs } from "../../src/recoup/getAccountOrgs";
import { createOrgGithubRepo } from "../../src/github/createOrgGithubRepo";
import { runOpenClawAgent } from "../../src/sandboxes/runOpenClawAgent";
import { getSandboxHomeDir } from "../../src/sandboxes/getSandboxHomeDir";

it("COUNTEREXAMPLE: different organization IDs produce the same display-name folder", async () => {
  vi.mocked(getAccountOrgs).mockResolvedValue([
    { organizationId: "synthetic-org-a", organizationName: "Team A" },
    { organizationId: "synthetic-org-b", organizationName: "Team / A" },
  ]);
  vi.mocked(createOrgGithubRepo)
    .mockResolvedValueOnce(
      "https://github.com/recoupable/org-team-a-synthetic-org-a",
    )
    .mockResolvedValueOnce(
      "https://github.com/recoupable/org-team-a-synthetic-org-b",
    );
  vi.mocked(runOpenClawAgent).mockResolvedValue({
    exitCode: 0,
    stdout: "",
    stderr: "",
  });
  const result = await ensureOrgRepos({} as Sandbox, "synthetic-account");
  const message = vi.mocked(runOpenClawAgent).mock.calls[0][1].message;
  expect(message.match(/- "team-a" → /g)).toHaveLength(2);
  expect(result).toBeUndefined(); // No account/org/repository binding is returned to the publisher.
  expect(fetch).not.toHaveBeenCalled();
});

it("COUNTEREXAMPLE: a delegated conflict outcome is not propagated to its caller", async () => {
  vi.mocked(getSandboxHomeDir).mockResolvedValue("/synthetic");
  const sandbox = {
    runCommand: vi.fn(async () => ({
      exitCode: 0,
      stdout: async () => "team-a\n",
    })),
  } as unknown as Sandbox;
  vi.mocked(runOpenClawAgent).mockResolvedValue({
    exitCode: 1,
    stdout: "",
    stderr: "synthetic rejected publication",
  });
  await expect(pushOrgRepos(sandbox)).resolves.toBeUndefined();
  expect(logger.log).toHaveBeenCalledWith("Org repo push complete", {
    count: 1,
  });
  expect(fetch).not.toHaveBeenCalled();
});
