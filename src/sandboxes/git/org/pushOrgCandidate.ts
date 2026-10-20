import type { Sandbox } from "@vercel/sandbox";
import { withOrgGitTransport } from "./withOrgGitTransport";
import type { OrgPublicationTarget, OrgPublicationResult } from "./types";

/** Exactly one push of a fixed commit against the pre-work remote observation. */
export async function pushOrgCandidate(
  sandbox: Sandbox,
  target: OrgPublicationTarget,
  sha: string,
): Promise<OrgPublicationResult["state"]> {
  return withOrgGitTransport(
    sandbox,
    target.repository,
    target.objectDirectory,
    async (runner) => {
      if (target.observedSha) {
        const ancestry = await runner.runCommand({
          cmd: "git",
          args: ["merge-base", "--is-ancestor", target.observedSha, sha],
        });
        if (ancestry.exitCode !== 0)
          return ancestry.exitCode === 1 ? "conflict" : "unconfirmed";
      }
      const pushed = await runner.runCommand({
        cmd: "git",
        args: [
          "push",
          `--force-with-lease=refs/heads/main:${target.observedSha ?? ""}`,
          "origin",
          `${sha}:refs/heads/main`,
        ],
      });
      if (pushed.exitCode === 0) return "confirmed";
      return /\[rejected\].*\(stale info\)/.test(await pushed.stderr())
        ? "conflict"
        : "unconfirmed";
    },
  );
}
