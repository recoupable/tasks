import type { Sandbox } from "@vercel/sandbox";
import { posix } from "node:path";

/** NUL-delimited keys and values preserve spaces, tabs and escaped subsection names. */
export async function validateOrgModulePaths(
  sandbox: Sandbox,
  paths: ReadonlySet<string>,
  blob?: string,
): Promise<boolean> {
  const git = async (args: string[]) =>
    sandbox.runCommand({
      cmd: "git",
      args: [
        "config",
        "--null",
        ...(blob ? ["--blob", blob] : ["-f", ".gitmodules"]),
        ...args,
      ],
    });
  const names = await git([
    "--name-only",
    "--get-regexp",
    "^submodule\\..*\\.path$",
  ]);
  if (names.exitCode === 1 && !(await names.stdout())) return true;
  if (names.exitCode !== 0) return false;
  for (const key of (await names.stdout()).split("\0").filter(Boolean)) {
    const result = await git(["--get-all", key]);
    if (result.exitCode !== 0) return false;
    const values = (await result.stdout()).split("\0");
    if (values.pop() !== "") return false;
    for (const path of values) {
      if (!path) return false;
      const prefix = ".openclaw/workspace/orgs/";
      if (
        (path.startsWith(prefix) || posix.normalize(path).startsWith(prefix)) &&
        (!paths.has(path) || key !== `submodule.${path}.path`)
      )
        return false;
    }
  }
  return true;
}
