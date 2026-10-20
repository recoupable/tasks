# Scoped organization publication

Setup now captures organization membership, repository identity, physical workspace and Git paths, and the remote `main` revision before delegating work to OpenClaw. This extends the guarded root writer (#158/#159); it replaces the organization clone/push prompts. No new job, authorization grant, mapping table or recovery store is introduced.

## Authority and controlled writes

The existing authenticated organizations API supplies the account's organization IDs. Duplicate IDs, missing names and folder-name collisions stop setup before repository creation. Existing organization repository setup must return its expected canonical Recoup GitHub URL. A provider read must affirm the numeric repository ID, owner/name/URL and explicit push permission. Missing provider permission data is a specific `repository_authority_unavailable` gap, not an implied grant.

The organization folder must be physically at its captured path, with exactly one expected fetch/push origin, a matching repository root and stable Git/object directories. Unknown folders, symlinks, stale local bases or unresolvable identity stop publication without deleting or rebinding the workspace. A missing authorized repository can be cloned deterministically; no existing folder is deleted or silently refreshed. Linked worktrees / `.git` files are supported through Git metadata rather than directory discovery.

After delegated setup, the caller rechecks membership and provider identity. Each eligible target stages and commits locally, captures one commit SHA, checks ancestry, and makes one push against its original observed remote revision. A confirmed absence permits creation only while `main` is still absent. There is no reobservation, reset, rebase, automatic retry, delegated force push or unconditional-force fallback.

Network Git commands use a temporary bare repository with a verified canonical origin and source objects accessed as alternates. System/global config, hooks and HTTP redirects are disabled. A source checkout's URL rewrites cannot choose the transport destination. The existing service credential is supplied as per-command HTTP configuration in the environment, not in arguments, remote URLs or new credential files; local staging/commit commands receive an empty authorization header. Temporary transport repositories are removed in `finally`.

## Results, recovery and root references

Per-target results are `confirmed`, `conflict`, `unconfirmed` or `denied`, with the captured candidate SHA when available. Lost acknowledgments remain unconfirmed even if a remote write happened. One target's success cannot hide another target's failure. Bounded outcome logs retain organization IDs and states without raw provider/Git errors or credentials.

Any binding issue or non-confirmed target returns failed publication to the existing `setup-sandbox` recovery flow. It attempts snapshot-and-persist before reporting the snapshot ID and shutting down. If snapshot persistence cannot be confirmed, existing recovery withholds explicit shutdown; this does not guarantee that the provider has kept the sandbox active. No permanent recovery promise is added.

Root preparation receives only confirmed organization receipts. It installs their exact commits as gitlinks and their canonical URLs as module URLs. Unbound existing module paths or stale root gitlinks reject preparation. No filesystem discovery can grant another organization publication. Ordinary files are staged first; acknowledged gitlinks are pinned afterwards, with only `.gitmodules` staged separately. This prevents a populated submodule’s unpublished HEAD from replacing the acknowledged commit. The checkout is never reset.

## Production effect and limits

Uncontended setup continues to publish. A renamed/colliding organization, unknown old workspace folder, removed membership, missing provider authority or competing writer now stops with recoverable local work instead of guessing, deleting a checkout or overwriting a newer branch. Old workspace layouts may require explicit reconciliation. Partial remote publication is possible: confirmed target receipts are retained, while the root remains unpublished until reconciliation. Setup automatic retries remain disabled.

The plan is an internal value constructed from the authorized setup account, not a public agent-supplied authorization document. Checks are observations, not a lock on provider administration: membership changes or repository replacement after a check are outside an atomic Git operation. Arbitrary native SDK/bash/model writers and the legacy OpenClaw credential-file/copy path remain separate limitations; this is not a global sandbox permission boundary, credential-removal migration or Context provenance guarantee.

## Verification boundary

Local tests use real bare repositories, linked worktrees and competing writers, with canonical synthetic URLs mapped to allowlisted local remotes only at the test transport boundary. Git is limited to the file protocol; provider authority is mocked separately. The suite covers collisions, missing authority, unknown paths, changed origins, changed repository IDs, membership revocation, concurrent pushes, partial outcomes, rewrite isolation, lost acknowledgments, credential placement, root reference retention and setup snapshot ordering. Provider permission tests check exact metadata and deny absent/false permission. Trigger discovery still excludes test support files.

These tests do not prove hosted customer GitHub permissions, a hosted sandbox roundtrip or deployed worker behavior. This implementation PR requires exact-head independent review before merge. Deployment follows the existing automatic main workflow; no manual deployment or hosted job is invoked during implementation.
