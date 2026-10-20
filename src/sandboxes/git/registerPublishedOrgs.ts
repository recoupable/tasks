import { getOrgRootBindings } from "./getOrgRootBindings";
import { validateOrgRootBindings } from "./validateOrgRootBindings";
import type { Sandbox } from "@vercel/sandbox";
import type { OrgPublicationResult } from "./org/types";

/** Register only commits whose organization publication was confirmed. */
export async function registerPublishedOrgs(
  sandbox: Sandbox,
  results: OrgPublicationResult[],
): Promise<boolean> {
  const paths = getOrgRootBindings(results);
  if (!paths || !(await validateOrgRootBindings(sandbox, results)))
    return false;
  const git = async (args: string[]) =>
    sandbox.runCommand({ cmd: "git", args });
  for (const [path, result] of paths) {
    if (
      (await sandbox.runCommand({ cmd: "mkdir", args: ["-p", "--", path] }))
        .exitCode !== 0
    )
      return false;
    for (const args of [
      ["config", "-f", ".gitmodules", `submodule.${path}.path`, path],
      [
        "config",
        "-f",
        ".gitmodules",
        `submodule.${path}.url`,
        result.target.repository.url,
      ],
      [
        "update-index",
        "--add",
        "--cacheinfo",
        `160000,${result.commitSha},${path}`,
      ],
    ])
      if ((await git(args)).exitCode !== 0) return false;
  }
  if (paths.size && (await git(["add", "--", ".gitmodules"])).exitCode !== 0)
    return false;
  return true;
}
