import type { Sandbox } from "@vercel/sandbox";
import { posix } from "node:path";
import { normalizeOrgRepositoryUrl } from "./normalizeOrgRepositoryUrl";
import { orgGitEnvironment } from "./orgGitEnvironment";

export async function readOrgWorkspaceIdentity(
  sandbox: Sandbox,
  path: string,
  expectedUrl: string,
) {
  const physical = await sandbox.runCommand({
    cmd: "realpath",
    args: ["-e", "--", path],
  });
  if (
    physical.exitCode !== 0 ||
    (await physical.stdout()).trim() !== path ||
    /[\x00-\x1f:]/.test(path)
  )
    throw new Error("Organization path is unresolved or indirect");
  const git = async (args: string[]) => {
    const result = await sandbox.runCommand({
      cmd: "git",
      args: ["-C", path, ...args],
      env: orgGitEnvironment(),
    });
    if (result.exitCode !== 0)
      throw new Error("Organization Git identity unavailable");
    return (await result.stdout()).trim();
  };
  if ((await git(["rev-parse", "--show-toplevel"])) !== path)
    throw new Error("Organization repository root mismatch");
  for (const args of [
    ["remote", "get-url", "--all", "origin"],
    ["remote", "get-url", "--push", "--all", "origin"],
  ]) {
    const urls = (await git(args)).split("\n");
    if (urls.length !== 1 || normalizeOrgRepositoryUrl(urls[0]) !== expectedUrl)
      throw new Error("Organization remote is not the authorized repository");
  }
  const gitDirectory = await git(["rev-parse", "--absolute-git-dir"]);
  const objectPath = posix.resolve(
    path,
    await git(["rev-parse", "--git-path", "objects"]),
  );
  const objects = await sandbox.runCommand({
    cmd: "realpath",
    args: ["-e", "--", objectPath],
  });
  const objectDirectory = (await objects.stdout()).trim();
  if (
    objects.exitCode !== 0 ||
    !objectDirectory.startsWith("/") ||
    /[\x00-\x1f:]/.test(objectDirectory) ||
    !gitDirectory.startsWith("/")
  )
    throw new Error("Organization object identity unavailable");
  return { gitDirectory, objectDirectory };
}
