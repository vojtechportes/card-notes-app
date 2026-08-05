# Phase 10 release readiness and operations

This document separates reproducible repository evidence from operator evidence that needs cloud registrations, signed artifacts, two installed Windows profiles/devices, or a deployed Cloudflare environment. Phase 10 must not be activated until both groups pass.

## Reproducible gates

Run from a clean checkout on Windows with Node 22.12 or newer:

```powershell
npm install
npm run verify:phase-10
npm run verify:phase-10:package
```

`verify:phase-10` runs every workspace test and type-check, builds backend/frontend/Electron/notification service, and performs the relay deployment dry run. `verify:phase-10:package` builds the unpacked Electron application, starts two isolated packaged OAuth verifiers concurrently, and smoke-tests the packaged backend runtime and SQLite native dependency.

The backend resilience suite uses two independent SQLite/device runtimes against one provider-neutral fake cloud. It verifies delayed/lost wake-up convergence, long-offline delete-versus-edit preservation, invalid-cursor enumeration, throttled pending work, and byte/hash-safe multi-megabyte asset transfer. Existing focused suites remain authoritative for each cursor/outbox crash boundary, notification replay/duplication, provider contract, pairing/switch recovery, relay outage, and frontend startup/offline/conflict state.

## OAuth registration gate

Follow `electron/OAUTH.md`. Record the registration IDs and reviewer without recording credentials.

- Google: native/public client, bare ephemeral loopback callback `http://127.0.0.1:{ephemeral-port}`, `openid`, profile/email claims, and `https://www.googleapis.com/auth/drive.appdata`. Complete consent-screen verification where required.
- Microsoft: native/public client, loopback callback ending `/oauth/callback/one-drive`, `openid`, `profile`, `email`, `offline_access`, and delegated `Files.ReadWrite.AppFolder`. Reject `Files.Read`, `Files.Read.All`, and other full-drive scopes.
- Both: no client secret; development and packaged redirect behavior; cancellation, timeout, state mismatch, refresh, revocation, and wrong-account checks.

Release builds require `NOTESTACK_GOOGLE_OAUTH_CLIENT_ID` and `NOTESTACK_MICROSOFT_OAUTH_CLIENT_ID`. Store them as GitHub Actions repository variables with those exact names. The release workflow exposes them only to the Windows app-directory build, validates that both are present, embeds them, and then verifies the packaged executable without inheriting either build-time environment value.

For local release verification, export both public IDs in the active PowerShell session before running `npm run verify:phase-10:package` or `npm run package:release`. Run release packaging only in the controlled release environment, then sign and verify artifacts using the root release workflow documentation. Never configure provider client secrets.

## Relay deployment and monitoring gate

Follow `notification-service/docs/operations.md` for the Cloudflare Worker/Durable Object deployment, `METRICS_AUTH_TOKEN`, WAF policy, TLS/custom domain, metrics, seven-day log retention, privacy boundary, PITR, incident response, and rollback. Required evidence:

1. deployment dry run and staging deploy identifier;
2. `/healthz`, `/readyz`, authenticated `/metrics`, and five-minute synthetic route;
3. two authenticated workspace-isolated sockets, invalid/replayed proof rejection, burst coalescing, overlapping channel deduplication, renewal lease recovery, forced restart/hibernation, and secret rotation;
4. alerts for readiness, 5xx, Durable Object/alarm exceptions, webhook silence, authentication spikes, rate limiting, storage, and cost;
5. relay outage followed by immediate desktop provider reconciliation and polling fallback.

The relay stores no notes, settings, labels, assets, OAuth credentials, provider account identifiers, email addresses, or provider file contents.

## Two-device packaged acceptance

Use two Windows devices or isolated user profiles with the signed release candidate. Capture app version, OS version, provider, workspace ID only in a restricted release record, and pass:

1. fresh opt-in and existing-workspace discovery for Google Drive and OneDrive;
2. Device A note/configuration/large-image creation received by Device B;
3. disjoint edits, same-field edits, edit/delete, configuration reorder/delete, and understandable recoverable conflicts while both devices are offline;
4. a simulated weeks-old stale device returning without resurrecting a tombstone;
5. duplicate and deliberately missed relay signals, expired channel/token/cursor, throttling, provider outage, relay outage, process termination at synchronization boundaries, and restart convergence;
6. disable/re-enable with pending writes retained, startup Retry/Work offline, reconnect/reinstall, account mismatch, repair, and provider switch with old cloud data preserved;
7. OS secure-storage persistence, broker rejection, no credential/content leakage in database, logs, command line, renderer, or relay.

## Diagnostics

Collect only application version, OS version, provider kind, public sync state/error classification, pending/conflict counts, timestamps, and redacted correlation IDs. Never collect note/configuration JSON, asset bytes or names, route/device/workspace identifiers in public tickets, provider file/resource IDs, OAuth data, broker bootstrap data, proofs, tokens, headers, request bodies, database files, WAL files, or raw logs.

For convergence incidents: preserve the local database, WAL, and managed assets; stop destructive repair; create and verify the built-in migration/pairing backup; record pending/conflict counts; test provider and relay reachability separately; and use preview/repair flows. Provider or relay deletion must never be inferred from absence alone.

## Activation and rollback

Activate through internal, small opt-in, expanded opt-in, then general availability cohorts. Advance only after at least 72 hours with no data-loss/security finding, successful provider cursor progression, stable outbox age, acceptable conflict and retry rates, healthy relay signals/fallback polling, and completed backup restoration drills. Keep synchronization disabled/no-provider by default until explicit user opt-in.

Stop rollout immediately for suspected data loss, credential/content leakage, cross-workspace routing, cursor advancement past failed apply, tombstone resurrection, unbounded trigger/retry behavior, broken backup restoration, or packaged startup failure. Disable new opt-ins and relay traffic as appropriate; retain local writes/outbox; roll desktop users back only when the older build understands the current local/remote schema; otherwise ship a forward repair. Relay code can roll back only across storage-compatible versions. Never automatically delete either provider's cloud workspace during rollback or switching.

Record each gate as `passed`, `failed`, or `not run`, with timestamp, build commit, environment, operator, and evidence link. `not run` is release-blocking for production-only gates.
