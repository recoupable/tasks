import type { Sandbox } from "@vercel/sandbox";
import { orgGitEnvironment } from "./orgGitEnvironment";

/** Local filters never receive the service credential in their command environment. */
export async function commitOrgCandidate(
  sandbox: Sandbox,
  path: string,
): Promise<string | undefined> {
  const env = orgGitEnvironment();
  env.GIT_CONFIG_VALUE_0 = "";
  const git = async (args: string[]) =>
    sandbox.runCommand({ cmd: "git", args: ["-C", path, ...args], env });
  if ((await git(["add", "-A"])).exitCode !== 0) return undefined;
  const diff = await git(["diff", "--cached", "--quiet"]);
  if (diff.exitCode !== 0 && diff.exitCode !== 1) return undefined;
  if (
    diff.exitCode === 1 &&
    (
      await git([
        "-c",
        "user.name=Recoup Agent",
        "-c",
        "user.email=agent@recoupable.dev",
        "commit",
        "-m",
        "Update organization files",
      ])
    ).exitCode !== 0
  )
    return undefined;
  const head = await git(["rev-parse", "--verify", "HEAD^{commit}"]);
  const sha = (await head.stdout()).trim();
  return head.exitCode === 0 && /^[a-f0-9]{40}$/.test(sha) ? sha : undefined;
}
