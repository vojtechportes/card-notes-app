# NoteStack synchronization notification service

This workspace is the content-free control plane required by Phase 10/T111. It is deployed separately from the desktop application and never calls Google Drive, reads synchronized documents, or receives provider credentials.

## Locked architecture

The production runtime is Cloudflare Workers with SQLite-backed Durable Objects. Every opaque `workspaceRouteId` is deterministically routed to one `RelayWorkspaceDurableObject`; this gives a workspace a single serialized owner for durable channel state, coalescing, renewal leases, and hibernatable WebSocket broadcast even when requests enter through different Worker instances. A separate singleton Durable Object holds low-cardinality operational counters.

This choice supplies managed public TLS, horizontal edge ingress, strong per-route state consistency, alarms, and WebSocket hibernation without adding PostgreSQL or Redis. Google webhook delivery remains only a wake-up hint. Relay loss never affects synchronization correctness; the desktop reconciles from the Google changes feed and keeps the watchdog polling required by T112.

## Content-free boundary

Durable state is restricted to:

- opaque workspace route IDs and device UUIDs;
- current/previous workspace verifier hashes and secret versions;
- one-time challenge nonces and connection-token hashes with expirations;
- opaque Google channel/resource IDs, verification-token hashes, expirations, and message numbers;
- renewal leases, coalescing timestamps, per-route rate windows, and aggregate counters.

Raw notification authentication keys, raw derived verifiers, raw connection/channel tokens, note/configuration documents, assets, OAuth credentials, provider account identifiers, email addresses, and provider file contents are neither persisted nor logged. The public Google endpoint accepts the required headers with an empty body only.

## Version 1 authentication protocol

All byte strings use unpadded base64url. `notificationAuthKey` is the exact 32-byte value from `workspace.json`; it never leaves the desktop.

1. Derive `workspaceVerifier = HMAC-SHA256(base64urlDecode(notificationAuthKey), UTF8("notestack-relay-verifier-v1" + U+0000 + workspaceRouteId))`.
2. Bootstrap `POST /v1/workspaces/{workspaceRouteId}/register` with `{ "verifier": workspaceVerifier, "secretVersion": 1 }`. Registration is create-only and idempotent for the same verifier/version. The unguessable route ID is the one-time bootstrap capability; TLS and at least 128 bits of route entropy are mandatory.
3. Request `POST /v1/workspaces/{workspaceRouteId}/challenges` and receive a one-minute `challengeId`, `challenge`, and `expiresAt`.
4. Compute `verifierHash = SHA-256(UTF8(workspaceVerifier))`. Build `proofPayload` by joining these fields with `:`: `notestack-relay-challenge-v1`, route ID, challenge ID, challenge, device UUID, secret version. Send `proof = HMAC-SHA256(base64urlDecode(verifierHash), UTF8(proofPayload))` to `POST /v1/workspaces/{workspaceRouteId}/tokens`.
5. A valid one-time challenge returns a five-minute opaque connection token bound to its secret version. Rotation closes old-version sockets and rejects old-version REST tokens when the rollover window expires. REST calls send `Authorization: Bearer {token}`. WebSockets offer both `notestack.relay.v1` and `notestack.token.{token}` in `Sec-WebSocket-Protocol`; the server selects only `notestack.relay.v1`. A token can upgrade one WebSocket and is never placed in the URL.
6. `PUT /v1/workspaces/{workspaceRouteId}/verifier` rotates to exactly `secretVersion + 1` and accepts a previous verifier only until the supplied rollover time, capped at 24 hours.

## Channel and WebSocket protocol

- `POST .../channels/prepare` returns an unguessable Google channel ID, a raw one-time verification token, the public webhook URL, and a ten-minute preparation expiration. Only the verification-token hash is stored.
- The credential-bearing desktop calls Google `changes.watch`, then `POST .../channels/{channelId}/finalize` with the opaque resource ID and an expiration no more than seven days away.
- Replacement channels may overlap. `DELETE .../channels/{channelId}` removes an obsolete channel.
- Google sends `POST /v1/google/webhooks/{workspaceRouteId}/{channelId}` with `X-Goog-Channel-ID`, `X-Goog-Resource-ID`, `X-Goog-Resource-State`, `X-Goog-Channel-Token`, and `X-Goog-Message-Number`. The relay validates every field, rejects spoofing, monotonically deduplicates message numbers, acknowledges accepted work with no body, and coalesces a burst into one `{"type":"workspace-changed","protocolVersion":1}` signal.
- Clients answer application heartbeat `ping` messages with `pong`. Frames are capped at 4 KiB, connections at 16 per workspace, outbound messages are fixed and small, and failed/backpressured sends are closed instead of queued.
- `POST .../renewal-lease` grants one connected device a two-minute lease. `DELETE .../renewal-lease?leaseId=...`, disconnect, or expiration releases ownership. A lease owner performs the provider call; the relay never receives its Google credential.

## Commands

- `npm run dev --workspace notification-service` starts the local Worker runtime.
- `npm run test --workspace notification-service` runs deterministic protocol/security tests.
- `npm run lint --workspace notification-service` type-checks the service.
- `npm run build --workspace notification-service` emits TypeScript build output.
- `npm run deploy:check --workspace notification-service` bundles and validates deployment without publishing.
- `npm run deploy --workspace notification-service` deploys after the operations checklist is satisfied.

See [docs/operations.md](docs/operations.md) for deployment, monitoring, retention, recovery, and rollback.
