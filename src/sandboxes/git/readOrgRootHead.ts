import type { Sandbox } from "@vercel/sandbox";

/** Confirm an existing commit or a genuinely unborn local branch; errors are not absence. */
export async function readOrgRootHead(
  sandbox: Sandbox,
): Promise<{ sha: string | null } | undefined> {
  const git = async (args: string[]) =>
    sandbox.runCommand({ cmd: "git", args });
  const head = await git(["rev-parse", "--verify", "--quiet", "HEAD^{commit}"]);
  const sha = (await head.stdout()).trim();
  if (head.exitCode === 0 && /^([a-f0-9]{40}|[a-f0-9]{64})$/.test(sha))
    return { sha };
  if (head.exitCode !== 1 || sha) return undefined;
  const symbolic = await git(["symbolic-ref", "--quiet", "HEAD"]);
  const ref = (await symbolic.stdout()).trim();
  if (symbolic.exitCode !== 0 || !/^refs\/heads\/[^\x00-\x20]+$/.test(ref))
    return undefined;
  const absent = await git(["show-ref", "--verify", "--quiet", ref]);
  return absent.exitCode === 1 && !(await absent.stdout()).trim()
    ? { sha: null }
    : undefined;
}
