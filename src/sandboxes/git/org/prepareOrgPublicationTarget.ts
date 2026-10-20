import type { Sandbox } from "@vercel/sandbox";
import { posix } from "node:path";
import { createOrgGithubRepo } from "../../../github/createOrgGithubRepo";
import { readOrgRepositoryAuthority } from "../../../github/readOrgRepositoryAuthority";
import { sanitizeRepoName } from "../../../github/sanitizeRepoName";
import { normalizeOrgRepositoryUrl } from "./normalizeOrgRepositoryUrl";
import { readOrgWorkspaceIdentity } from "./readOrgWorkspaceIdentity";
import { withOrgGitTransport } from "./withOrgGitTransport";
import { orgGitEnvironment } from "./orgGitEnvironment";
import { readSandboxMainRevision } from "../../readSandboxMainRevision";
import type { OrgPublicationTarget } from "./types";

export async function prepareOrgPublicationTarget(
  sandbox: Sandbox,
  accountId: string,
  org: { organizationId: string; organizationName: string },
  root: string,
): Promise<OrgPublicationTarget> {
  const alias = sanitizeRepoName(org.organizationName);
  const name = `org-${alias}-${org.organizationId}`.toLowerCase();
  const created = await createOrgGithubRepo(
    org.organizationName,
    org.organizationId,
  );
  if (
    !created ||
    normalizeOrgRepositoryUrl(created) !==
      `https://github.com/recoupable/${name}`
  )
    throw new Error("repository_setup_binding_unavailable");
  const repository = await readOrgRepositoryAuthority(name);
  if (!repository) throw new Error("repository_authority_unavailable");
  const workspacePath = posix.join(root, alias);
  return withOrgGitTransport(
    sandbox,
    repository,
    undefined,
    async (runner, directory) => {
      const observed = await readSandboxMainRevision(runner);
      if (!observed) throw new Error("remote_revision_unavailable");
      const exists = await sandbox.runCommand({
        cmd: "test",
        args: ["-e", workspacePath],
      });
      if (exists.exitCode === 1) {
        const cloned = await sandbox.runCommand({
          cmd: "git",
          args: ["clone", "--template=", repository.url, workspacePath],
          cwd: directory,
          env: orgGitEnvironment(),
        });
        if (cloned.exitCode !== 0)
          throw new Error("repository_clone_unavailable");
      } else if (exists.exitCode !== 0)
        throw new Error("workspace_presence_unavailable");
      const identity = await readOrgWorkspaceIdentity(
        sandbox,
        workspacePath,
        repository.url,
      );
      if (observed.sha) {
        const head = await sandbox.runCommand({
          cmd: "git",
          args: ["-C", workspacePath, "rev-parse", "--verify", "HEAD^{commit}"],
          env: orgGitEnvironment(),
        });
        const candidate = (await head.stdout()).trim();
        if (head.exitCode !== 0 || !/^[a-f0-9]{40}$/.test(candidate))
          throw new Error("local_base_unavailable");
        const ancestry = await sandbox.runCommand({
          cmd: "git",
          args: [
            "--git-dir",
            directory,
            "merge-base",
            "--is-ancestor",
            observed.sha,
            candidate,
          ],
          env: orgGitEnvironment(identity.objectDirectory),
        });
        if (ancestry.exitCode !== 0) throw new Error("workspace_base_conflict");
      }
      return {
        accountId,
        organizationId: org.organizationId,
        alias,
        workspaceRoot: root,
        workspacePath,
        ...identity,
        repository,
        observedSha: observed.sha,
      };
    },
  );
}
