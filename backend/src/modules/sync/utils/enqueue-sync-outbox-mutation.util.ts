import type { Database } from 'better-sqlite3'
import type { EnqueueSyncOutboxMutationInput } from '../types/enqueue-sync-outbox-mutation-input'
import { createSyncTargetHash } from './create-sync-target-hash.util'
import { getSyncLogicalKey } from './get-sync-logical-key.util'

interface BoundWorkspaceRow {
  workspace_id: string
  device_id: string
  active_provider: string
}

export const enqueueSyncOutboxMutation = (
  database: Database,
  input: EnqueueSyncOutboxMutationInput
): void => {
  const workspace = database
    .prepare(
      `
      SELECT sync_identity.workspace_id, sync_identity.device_id,
             sync_account_state.active_provider
      FROM sync_identity
      INNER JOIN sync_account_state ON sync_account_state.id = 1
      WHERE sync_identity.id = 1
        AND sync_account_state.provider_workspace_id IS NOT NULL
        AND sync_account_state.active_provider IS NOT NULL
    `
    )
    .get() as BoundWorkspaceRow | undefined

  if (!workspace) {
    return
  }

  const logicalKey = getSyncLogicalKey(
    database,
    input.entityKind,
    input.entityId
  )
  const targetHash = createSyncTargetHash(
    database,
    input.entityKind,
    input.entityId
  )
  const duplicate = database
    .prepare(
      `
      SELECT 1 FROM sync_outbox
      WHERE workspace_id = ?
        AND logical_key = ?
        AND latest_mutation_id = ?
        AND target_hash = ?
      LIMIT 1
    `
    )
    .get(workspace.workspace_id, logicalKey, input.mutationId, targetHash)

  if (duplicate) {
    return
  }

  const pending = database
    .prepare(
      `
      SELECT mutation_id FROM sync_outbox
      WHERE workspace_id = ? AND logical_key = ? AND status = 'pending'
    `
    )
    .get(workspace.workspace_id, logicalKey) as
    { mutation_id: string } | undefined

  if (pending) {
    database
      .prepare(
        `
        UPDATE sync_outbox
        SET latest_mutation_id = @latestMutationId,
            intent = @intent,
            target_hash = @targetHash,
            originating_device_id = @originatingDeviceId,
            next_attempt_at = NULL,
            last_failure_classification = NULL,
            coalesced_count = coalesced_count + 1,
            updated_at = @updatedAt
        WHERE mutation_id = @mutationId AND status = 'pending'
      `
      )
      .run({
        mutationId: pending.mutation_id,
        latestMutationId: input.mutationId,
        intent: input.intent,
        targetHash,
        originatingDeviceId: workspace.device_id,
        updatedAt: input.modifiedAt,
      })
    return
  }

  const remoteState = database
    .prepare(
      `
      SELECT content_hash FROM sync_remote_objects
      WHERE workspace_id = ? AND provider = ? AND logical_key = ?
      ORDER BY updated_at DESC LIMIT 1
    `
    )
    .get(workspace.workspace_id, workspace.active_provider, logicalKey) as
    { content_hash: string | null } | undefined

  database
    .prepare(
      `
      INSERT INTO sync_outbox (
        mutation_id, latest_mutation_id, workspace_id, entity_kind, entity_id,
        logical_key, intent, base_hash, target_hash, originating_device_id,
        created_at, updated_at
      ) VALUES (
        @mutationId, @latestMutationId, @workspaceId, @entityKind, @entityId,
        @logicalKey, @intent, @baseHash, @targetHash, @originatingDeviceId,
        @createdAt, @updatedAt
      )
    `
    )
    .run({
      mutationId: input.mutationId,
      latestMutationId: input.mutationId,
      workspaceId: workspace.workspace_id,
      entityKind: input.entityKind,
      entityId: input.entityId,
      logicalKey,
      intent: input.intent,
      baseHash: remoteState?.content_hash ?? null,
      targetHash,
      originatingDeviceId: workspace.device_id,
      createdAt: input.modifiedAt,
      updatedAt: input.modifiedAt,
    })
}
