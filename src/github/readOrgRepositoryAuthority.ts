import { z } from "zod";
import type { OrgRepository } from "../sandboxes/git/org/types";
const schema = z.object({
  id: z.number().int().positive().safe(),
  full_name: z.string(),
  html_url: z.string(),
  permissions: z.object({ push: z.literal(true) }),
});
/** Existing service identity must affirm this exact repository and write permission. */
export async function readOrgRepositoryAuthority(
  name: string,
): Promise<OrgRepository | undefined> {
  const token = process.env.GITHUB_TOKEN;
  if (!token || !/^[a-z0-9._-]+$/.test(name)) return undefined;
  const url = `https://github.com/recoupable/${name}`;
  try {
    const response = await fetch(
      `https://api.github.com/repos/recoupable/${encodeURIComponent(name)}`,
      {
        redirect: "error",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
    if (!response.ok) return undefined;
    const data = schema.safeParse(await response.json());
    if (
      !data.success ||
      data.data.full_name.toLowerCase() !== `recoupable/${name}` ||
      data.data.html_url.toLowerCase() !== url
    )
      return undefined;
    return { id: data.data.id, owner: "recoupable", name, url };
  } catch {
    return undefined;
  }
}
