export interface OrgRepository {
  id: number;
  owner: "recoupable";
  name: string;
  url: string;
}
export interface OrgPublicationTarget {
  accountId: string;
  organizationId: string;
  alias: string;
  workspaceRoot: string;
  workspacePath: string;
  gitDirectory: string;
  objectDirectory: string;
  repository: OrgRepository;
  observedSha: string | null;
}
export interface OrgPublicationIssue {
  organizationId?: string;
  reason: string;
}
export interface OrgPublicationPlan {
  accountId: string;
  workspaceRoot: string;
  targets: OrgPublicationTarget[];
  issues: OrgPublicationIssue[];
}
export interface OrgPublicationResult {
  target: OrgPublicationTarget;
  state: "confirmed" | "conflict" | "unconfirmed" | "denied";
  commitSha?: string;
}
export interface OrgPublicationBatch {
  ready: boolean;
  results: OrgPublicationResult[];
  issues: OrgPublicationIssue[];
}
