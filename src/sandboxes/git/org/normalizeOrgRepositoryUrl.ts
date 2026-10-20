/** Comparison only: never returns or logs credentials from a workspace remote. */
export function normalizeOrgRepositoryUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "github.com" ||
      url.port ||
      url.search ||
      url.hash
    )
      return null;
    const path = url.pathname.replace(/\/$/, "").replace(/\.git$/i, "");
    if (!/^\/recoupable\/[a-z0-9._-]+$/i.test(path)) return null;
    return `https://github.com${path.toLowerCase()}`;
  } catch {
    return null;
  }
}
