import "./provisionSandbox.fixture";
import { beforeEach, expect, it, vi } from "vitest";
import type { Sandbox } from "@vercel/sandbox";
import { provisionSandbox } from "../provisionSandbox";
import { ensureGithubRepo } from "../ensureGithubRepo";
import { pushSandboxToGithub } from "../pushSandboxToGithub";
beforeEach(() => vi.clearAllMocks());
it("distinguishes no configured repository from a failed publication", async () => {
  vi.mocked(ensureGithubRepo).mockResolvedValueOnce(undefined);
  const result = await provisionSandbox({} as Sandbox, "sbx", "actor");
  expect(result).toEqual({ githubRepo: undefined, githubPublished: null });
  expect(pushSandboxToGithub).not.toHaveBeenCalled();
});
