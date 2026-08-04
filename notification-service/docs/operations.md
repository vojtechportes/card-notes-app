# Notification service operations

## Runtime and durable state

Production is locked to a Cloudflare Worker on the `notifications.notestack.app` custom domain with two SQLite-backed Durable Object namespaces. `WORKSPACES` is sharded by opaque route ID, so all horizontal Worker instances reach the same serialized broadcaster/state owner. `METRICS` holds aggregate counters only. The service uses the Hibernation WebSocket API and serialized socket attachments, so clients survive object eviction without relying on in-memory identity.

The deployment intentionally has no Google credential, provider SDK, database connection string, or access to NoteStack application storage. Set only the monitoring secret:

```powershell
npx wrangler secret put METRICS_AUTH_TOKEN --config notification-service/wrangler.jsonc
```

`PUBLIC_BASE_URL` and the custom domain must remain identical. Cloudflare must manage a valid public TLS certificate. Disable the route if TLS validation, Durable Object binding, or readiness fails.

## Pre-deployment checklist

1. Use a dedicated Cloudflare production account/project with least-privilege deploy credentials and Workers/Durable Objects billing alerts.
2. Confirm DNS and the custom domain are controlled by NoteStack.
3. Configure `METRICS_AUTH_TOKEN` as a Wrangler secret; never place it in `wrangler.jsonc`, source control, a URL, or logs.
4. Apply Cloudflare WAF/body/header limits. Keep `/healthz` bounded to 60 requests/minute/IP, registration/challenge/token endpoints to 120/minute/IP, and the Google webhook surface to 5,000/minute/IP plus the service's durable 600 attempts/minute/workspace and 300 accepted notifications/minute/workspace limits. Do not use provider/account values as rate-limit keys.
5. Run `npm run test --workspace notification-service`, `npm run lint --workspace notification-service`, `npm run build --workspace notification-service`, and `npm run deploy:check --workspace notification-service`.
6. Deploy to staging first. Exercise bootstrap, invalid/replayed proof, two authenticated devices, overlapping channels, duplicate webhooks, coalescing, lease disconnect recovery, readiness, metrics authorization, and a forced Worker restart. While an authenticated socket remains open, force its Durable Object to evict and verify that a later webhook reaches that same socket through its serialized attachment; this hibernation-survival gate requires the deployed Cloudflare runtime because the local Miniflare eviction helper does not complete reliably for hibernatable sockets.
7. Upload a version and shift production traffic gradually. Durable Objects run one code version at a time, so storage/protocol changes must remain backward-compatible throughout the rollout.

The selected runtime capabilities and constraints are documented by Cloudflare's official guides for [hibernatable WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/), [SQLite-backed durable state and PITR](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/), [Durable Object alarms](https://developers.cloudflare.com/durable-objects/api/alarms/), [limits](https://developers.cloudflare.com/durable-objects/platform/limits/), and [gradual deployments](https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/).

## Health, metrics, and alerts

- `GET /healthz` is a process liveness probe and must return 200 without touching storage.
- `GET /readyz` reads the metrics Durable Object and returns 503 when durable state is unavailable.
- `GET /metrics` requires `Authorization: Bearer $METRICS_AUTH_TOKEN` and exports low-cardinality counters. Cloudflare namespace metrics and Workers Logs remain the source for request latency, exceptions, CPU, storage, and WebSocket runtime telemetry.
- Page the operator when readiness fails for five minutes, 5xx responses exceed 1% for five minutes, Durable Object/alarm exceptions occur, or valid webhook delivery stops while Google channels are active.
- Create warning alerts for rejected authentication or webhooks increasing fivefold over the seven-day baseline, rate limiting, connection-limit closures, storage growth, and unexpected request-cost growth.
- Run a synthetic authenticated route in staging every five minutes. Production synthesis must use a dedicated opaque workspace and must never contain user identifiers.

Automatic Cloudflare invocation logs are disabled in `wrangler.jsonc` because they include request URLs. Custom logs are structured allowlisted events: service, event, outcome, status/error code, duration, and count. Route IDs, device IDs, request headers/bodies, URL query strings, tokens, proofs, and provider resource IDs are never logged. Configure Workers Logs/Logpush access to the operations role only and delete hot logs after seven days. Logs have no archive or backup.

## Retention and privacy

- Challenges expire after one minute; prepared channels after ten minutes; connection tokens after five minutes; leases after two minutes; previous verifiers after at most 24 hours; Google channels at their provider expiration (at most seven days). Durable alarms physically purge expired records; checks also enforce logical expiry before every use.
- Current verifier hashes and active opaque channel routing state remain until rotation/removal or authenticated workspace reset is introduced with the T112 lifecycle. They contain no synchronized content and cannot authorize provider access.
- Aggregate counters remain for the namespace lifetime and contain no route/device labels.
- SQLite-backed Durable Objects provide point-in-time recovery for the preceding 30 days. This is the locked backup/recovery mechanism for routing state. There is no content export and no secondary database.
- After an intentional state deletion, PITR history ages out after 30 days. Operational logs age out after seven days.

Privacy statement: the relay cannot read NoteStack notes, settings, labels, assets, or cloud files. Google/Microsoft APIs are contacted directly by the desktop. The relay sees only opaque routing identifiers and delivery metadata needed to wake devices.

## Recovery and rollback

Relay availability is not a correctness dependency. During an outage, desktop writes continue locally; T112 must reconcile immediately on reconnect and retain adaptive Google changes-feed polling/watchdog behavior.

For bad application code, stop traffic progression and roll back to the last known-good Worker version. Because only one version of a Durable Object runs at once, verify its code understands the stored version-1 snapshot before rollback. Do not roll back a destructive storage migration; ship a forward-compatible repair first.

For corrupted or accidentally deleted routing state:

1. Disable the public route or reject mutations while preserving health visibility.
2. Identify the affected Durable Object using restricted Cloudflare operational tooling; never copy its opaque ID into tickets or chat.
3. Select a PITR bookmark within 30 days and use the Durable Object PITR API to restore the whole embedded database, retaining the returned pre-restore bookmark so the restore can be undone.
4. Re-enable the route, verify readiness and authentication, and require connected desktops to reconcile from the authoritative provider changes feed.
5. If PITR is unavailable, leave the relay empty. Devices recreate channels after immediate reconciliation; do not attempt to reconstruct provider credentials centrally.

Review this runbook quarterly and before changing the Cloudflare compatibility date, Durable Object migration tag, protocol version, retention, WAF policy, or custom domain.
