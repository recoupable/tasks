import type { Sandbox } from "@vercel/sandbox";
import type { OrgPublicationResult } from "./org/types";
import { validateOrgModulePaths } from "./validateOrgModulePaths";
import { getOrgRootBindings } from "./getOrgRootBindings";

/** Read before broad staging: removed gitlinks must not disappear before authorization. */
export async function validateOrgRootBindings(
  sandbox: Sandbox,
  results: OrgPublicationResult[],
): Promise<boolean> {
  const paths = getOrgRootBindings(results);
  if (!paths) return false;
  const prefix = ".openclaw/workspace/orgs/";
  const git = async (args: string[]) =>
    sandbox.runCommand({ cmd: "git", args });
  if (!(await validateOrgModulePaths(sandbox, new Set(paths.keys()))))
    return false;
  const indexed = await git(["ls-files", "--stage", "-z", "--", prefix]);
  if (indexed.exitCode !== 0) return false;
  for (const entry of (await indexed.stdout()).split("\0").filter(Boolean)) {
    if (
      !entry.startsWith("160000 ") ||
      !paths.has(entry.slice(entry.indexOf("\t") + 1))
    )
      return false;
  }
  return true;
}
