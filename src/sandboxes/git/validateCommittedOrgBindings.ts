import type { Sandbox } from "@vercel/sandbox";
import { readOrgRootHead } from "./readOrgRootHead";
import { validateOrgModulePaths } from "./validateOrgModulePaths";

/** Validate committed authority even when the index already stages its removal. */
export async function validateCommittedOrgBindings(
  sandbox: Sandbox,
  paths: ReadonlySet<string>,
): Promise<boolean> {
  const head = await readOrgRootHead(sandbox);
  if (!head) return false;
  if (!head.sha) return true;
  const git = async (args: string[]) =>
    sandbox.runCommand({ cmd: "git", args });
  const links = await git([
    "ls-tree",
    "-r",
    "-z",
    head.sha,
    "--",
    ".openclaw/workspace/orgs/",
  ]);
  if (links.exitCode !== 0) return false;
  for (const entry of (await links.stdout()).split("\0").filter(Boolean)) {
    if (
      !entry.startsWith("160000 commit ") ||
      !paths.has(entry.slice(entry.indexOf("\t") + 1))
    )
      return false;
  }
  const modules = await git(["ls-tree", "-z", head.sha, "--", ".gitmodules"]);
  if (modules.exitCode !== 0) return false;
  const module = await modules.stdout();
  if (!module) return true;
  if (
    !/^(100644|100755) blob ([a-f0-9]{40}|[a-f0-9]{64})\t\.gitmodules\0$/.test(
      module,
    )
  )
    return false;
  return validateOrgModulePaths(sandbox, paths, `${head.sha}:.gitmodules`);
}
