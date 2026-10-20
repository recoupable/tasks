/** Bounded reason codes, never raw provider errors or credential-bearing Git URLs. */
export class OrgBindingError extends Error {
  constructor(
    readonly reason:
      | "repository_setup_binding_unavailable"
      | "repository_authority_unavailable"
      | "remote_revision_unavailable"
      | "repository_clone_unavailable"
      | "workspace_presence_unavailable"
      | "local_base_unavailable"
      | "workspace_base_conflict",
  ) {
    super(reason);
  }
}
