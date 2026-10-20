import type { Sandbox } from "@vercel/sandbox";
import { posix } from "node:path";

export async function validateOrgWorkspaceEntries(
  sandbox: Sandbox,
  root: string,
  aliases: string[],
): Promise<boolean> {
  const listed = await sandbox.runCommand({
    cmd: "find",
    args: [root, "-mindepth", "1", "-maxdepth", "1", "-print0"],
  });
  if (listed.exitCode !== 0) return false;
  const allowed = new Set(aliases.map((alias) => posix.join(root, alias)));
  const entries = (await listed.stdout()).split("\0").filter(Boolean);
  for (const entry of entries) {
    if (!allowed.has(entry)) return false;
    const link = await sandbox.runCommand({ cmd: "test", args: ["-L", entry] });
    if (link.exitCode !== 1) return false;
    if (
      (await sandbox.runCommand({ cmd: "test", args: ["-d", entry] }))
        .exitCode !== 0
    )
      return false;
  }
  return true;
}
