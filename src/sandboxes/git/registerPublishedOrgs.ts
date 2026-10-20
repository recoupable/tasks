import type { Sandbox } from "@vercel/sandbox";
import type { OrgPublicationResult } from "./org/types";

/** Register only commits whose organization publication was confirmed. */
export async function registerPublishedOrgs(
  sandbox: Sandbox,
  results: OrgPublicationResult[],
): Promise<boolean> {
  const prefix = ".openclaw/workspace/orgs/";
  const paths = new Map<string, OrgPublicationResult>();
  for (const result of results) {
    const alias = result.target?.alias;
    if (
      result.state !== "confirmed" ||
      !result.commitSha ||
      !/^[a-f0-9]{40}$/.test(result.commitSha) ||
      !/^[a-z0-9-]+$/.test(alias) ||
      paths.has(prefix + alias)
    )
      return false;
    paths.set(prefix + alias, result);
  }
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
  // Retain no stale or unbound organization gitlinks in the root index.
  const indexed = await git(["ls-files", "--stage", "-z", "--", prefix]);
  if (indexed.exitCode !== 0) return false;
  for (const entry of (await indexed.stdout()).split("\0").filter(Boolean)) {
    if (
      !entry.startsWith("160000 ") ||
      !paths.has(entry.slice(entry.indexOf("\t") + 1))
    )
      return false;
  }
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
  return true;
}
