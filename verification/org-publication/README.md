# Organization publication: binding prerequisite and local counterexamples

Status: diagnostic handoff under existing checkpoint D / app #2116 and #2140. This is **not a production protection patch**. No worker, job, credential, access or customer repository changed. Base: merged Tasks #158, `ca5dc9a143f7349554e2216ac1fdeed361b9345d`. That merge's automatic deployment failed because test fixtures were indexed; the separate release repair is Tasks #159. Do not infer hosted deployment from this source audit.

## Why changing the force-push instruction is insufficient

`pushOrgRepos(sandbox): Promise<void>` receives neither account/organization identity nor approved repository/path/revision. It discovers directories and tells OpenClaw to commit and `git push origin HEAD:main --force`. The agent's exit code is ignored. `ensureOrgRepos(sandbox, accountId)` obtains organization IDs/names and GitHub repository URLs but returns `void`; the binding is lost before publication. Local folders use only a sanitized display name, so different organization IDs can collide.

A fresh expected-tip lease answers “is this branch still at the observed commit?” It cannot answer “is this the repository this organization is authorized to publish?” Two repositories can share the same tip. A version-only patch built on a retargeted local origin can pass its ancestry and lease checks while updating the wrong repository. Root #158's version helper is correct within its stated root-publication contract; it is not a repository-authorization service.

Existing primitives should be reused: `getAccountOrgs` supplies organization IDs/names, the repository setup obtains GitHub creation/existing-repository receipts, and `getAccountSandboxes` can read an account's registered repository through API authorization. The org setup does not currently retain/pass those receipts or persist a canonical org repository binding here. Do not assume an org UUID is automatically an authorized account lookup, or reconstruct a canonical repository from a mutable display name. This handoff does not claim the platform has no repository lookup; it identifies the missing binding at this publisher boundary.

## Executable counterexamples

Run from the Tasks repository root:

```sh
pnpm exec vitest run --config verification/org-publication/vitest.config.ts
```

Five passing diagnostic probes demonstrate the current gaps, **not safety acceptance**:

| Probe                        | Actual source exercised                                                                  | Observation                                                                                                                                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stale delegated push         | Current `pushOrgRepos`, actual shell discovery, local Git                                | A deterministic stand-in obeying the exact force-push recipe replaces a newer peer tip; the peer-only file disappears from main. No real model is run.                                             |
| Retargeted discovered origin | Current publisher/discovery and local Git                                                | A discovered folder retargeted outside a synthetic allowed set publishes to that other local repository; the intended repository is unchanged. This is not a claim about live account permissions. |
| Lease-only adaptation        | Merged `readSandboxMainRevision` and `pushSandboxMainIfUnchanged`, local Git             | With equal initial tips, the real explicit lease/ancestry helper succeeds at a retargeted repository. Version equality cannot supply missing account/repository authority.                         |
| Display-name collision       | Real `ensureOrgRepos` and sanitization; fixture account/org and GitHub lookup boundaries | Two distinct organization IDs produce two clone instructions for the same `team-a` folder, and no binding is returned to the caller.                                                               |
| Ignored publication result   | Real `pushOrgRepos`; fixture delegated conflict response                                 | A rejected delegated publication still resolves `void` and logs completion, so simply changing the recipe would not propagate conflict recovery.                                                   |

The first two probes use a deterministic stand-in that executes **only** the Git recipe the actual publisher emits. They do not prove how a frontier model behaves. Discovery and Git operations are real and restricted to temporary local repositories; the synthetic allowlist is declared by the fixture, not a real GitHub grant. All HTTP is denied and the source token-presence check receives an unused synthetic string. No hosted sandbox, provider model or customer data is used. Cleanup removes only the generated temporary directories.

These `.probe.ts` files are deliberately outside the ordinary test selection and outside Trigger's configured `src/tasks` directory. They are manual diagnostic witnesses, not regression tests requiring an unsafe behavior to remain forever. Update or retire them alongside a real fix; a future removal of the force-push recipe should invalidate its corresponding witness. Normal `pnpm test` does not establish that these probes ran; use the command above.

## Exact prerequisite for a safe implementation

Before agent work, carry a server-derived publication plan through the existing setup/provisioning path. Its minimum fields are:

```ts
type OrgPublicationTarget = {
  accountId: string;
  organizationId: string;
  repository: { owner: string; name: string };
  workspacePath: string;
  branch: "refs/heads/main";
  observedCommit: string | null; // null only after confirmed branch absence
};
```

This is an internal handoff of existing identity/repository evidence, **not a new database, permission ledger or generic capability system**. A target declared by an agent or inferred from a local folder/remote is not authoritative. Establish the account at the authorized entry point; reuse current organization membership and canonical repository records/verified setup receipts. Reject missing/inaccessible bindings instead of silently using a discovered remote.

The bounded implementation should then:

1. Preserve the authoritative org/repository mapping returned by setup rather than dropping it. Use an ID-bound local target, or reject ambiguous legacy display-name aliases. Do not automatically delete, rename or overwrite existing customer folders to resolve a collision.
2. Validate the physical workspace path, actual repository root and intended push destination against that plan. Reject mismatched/multiple push destinations, unexpected URL rewriting or scope changes. Do not treat mutable `.gitmodules`/local Git config as the authority or log credential-bearing URLs.
3. Observe each authorized remote branch **before** setup skills/agents begin changing files, with confirmed absence distinct from lookup/auth/transport failure. Keep that exact observation. No observation after conflict merely to make a stale push succeed.
4. Replace the delegated publish recipe with a deterministic publisher bound to that target. Capture a specific local commit, require the observed base in its history, and conditionally publish against the original tip/absence without refresh-and-force fallback. Arbitrary agents may still compute locally; this does not claim a global shell/SDK lock.
5. Return per-target confirmed/conflict/unconfirmed receipts and preserve unpublished files/commits for recovery. Propagate that outcome before root publication: do not publish a root gitlink to an org commit that the remote did not accept. The current `void` contract and ignored agent exit code cannot provide this guarantee.

These prerequisites require widening the current publisher's **internal input/output contract** and threading existing authorization/setup evidence before work. That is the next concrete implementation slice to qualify. Changing only the prompt or adding a lease to discovered folders would be an unsafe partial patch, so no production writer change is included here.

Required future acceptance: allowed target succeeds; wrong/missing/revoked target denied; display-name collisions denied or explicitly reconciled; changed remote/config/path denied; two writers conflict without losing either side; absent branch create race; stable captured local commit; delegated/SDK errors propagate; failed org publication does not publish an unreachable root gitlink; recovery and ordinary no-org setup remain usable. Reuse the existing root publication helpers only after these target bindings are supplied; do not duplicate Records' Context provenance fixtures.

## Inspected source identities

At base `ca5dc9a143f7349554e2216ac1fdeed361b9345d`:

- `src/sandboxes/git/pushOrgRepos.ts`: blob `969a4f64532ed2deea19c2895548b2f43e9c658d`.
- `src/sandboxes/ensureOrgRepos.ts`: blob `512c4c7a68ed125c14b0f4ee06d1b11c981a27d1`.
- `src/recoup/getAccountOrgs.ts`: blob `8937ec63264f67ebf5505fe3a5f097ff24c23ca2`.
- Also inspected `createOrgGithubRepo`, `getAccountSandboxes`, `sanitizeRepoName`, `addOrgSubmodules`, `prepareSandboxRootPublication` and `provisionSandbox`.
- Existing Tasks #140 owns gitlink discovery/redundant-setup changes; Tasks #82 concerns root remote identity. Neither supplies this org publication plan. Their work is not copied here.

The exact probe output is five passing cases across three files. Full TypeScript diagnostics match the existing 14 baseline errors; this does not claim a clean repository typecheck or production safety. No merge, deployment or hosted mutation is performed by this handoff.
