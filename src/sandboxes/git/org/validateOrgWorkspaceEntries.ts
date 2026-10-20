import type { Sandbox } from "@vercel/sandbox";
import { posix } from "node:path";

export async function validateOrgWorkspaceEntries(
  sandbox: Sandbox,
  root: string,
  aliases: string[],
): Promise<"valid" | "unbound" | "unconfirmed"> {
  try {
    const listed = await sandbox.runCommand({
      cmd: "find",
      args: [root, "-mindepth", "1", "-maxdepth", "1", "-print0"],
    });
    if (listed.exitCode !== 0) return "unconfirmed";
    const allowed = new Set(aliases.map((alias) => posix.join(root, alias)));
    for (const entry of (await listed.stdout()).split("\0").filter(Boolean)) {
      if (!allowed.has(entry)) return "unbound";
      const link = await sandbox.runCommand({
        cmd: "test",
        args: ["-L", entry],
      });
      if (link.exitCode === 0) return "unbound";
      if (link.exitCode !== 1) return "unconfirmed";
      const directory = await sandbox.runCommand({
        cmd: "test",
        args: ["-d", entry],
      });
      if (directory.exitCode === 1) return "unbound";
      if (directory.exitCode !== 0) return "unconfirmed";
    }
    return "valid";
  } catch {
    return "unconfirmed";
  }
}
