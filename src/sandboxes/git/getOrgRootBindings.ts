import type { OrgPublicationResult } from "./org/types";

export function getOrgRootBindings(
  results: OrgPublicationResult[],
): Map<string, OrgPublicationResult> | undefined {
  const paths = new Map<string, OrgPublicationResult>();
  for (const result of results) {
    const alias = result.target?.alias;
    if (
      result.state !== "confirmed" ||
      !result.commitSha ||
      !/^[a-f0-9]{40}$/.test(result.commitSha) ||
      !/^[a-z0-9-]+$/.test(alias)
    )
      return undefined;
    const path = `.openclaw/workspace/orgs/${alias}`;
    if (paths.has(path)) return undefined;
    paths.set(path, result);
  }
  return paths;
}
