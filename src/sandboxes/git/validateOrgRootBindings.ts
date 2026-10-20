import type { Sandbox } from "@vercel/sandbox";
import type { OrgPublicationResult } from "./org/types";
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
  const modules = await git([
    "config",
    "-f",
    ".gitmodules",
    "--get-regexp",
    "^submodule\\..*\\.path$",
  ]);
  if (modules.exitCode !== 0 && modules.exitCode !== 1) return false;
  for (const line of (await modules.stdout())
    .trim()
    .split("\n")
    .filter(Boolean)) {
    const space = line.indexOf(" ");
    const key = line.slice(0, space),
      path = line.slice(space + 1);
    if (
      path.startsWith(prefix) &&
      (!paths.has(path) || key !== `submodule.${path}.path`)
    )
      return false;
  }
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
