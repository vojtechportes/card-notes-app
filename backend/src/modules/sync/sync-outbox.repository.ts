import { Inject, Injectable } from '@nestjs/common'
import type { Database } from 'better-sqlite3'
import { v4 as uuidV4 } from 'uuid'
import { DatabaseService } from '../database/database.service'
import type { ClaimSyncOutboxOptions } from './types/claim-sync-outbox-options'
import type { FailSyncOutboxMutationInput } from './types/fail-sync-outbox-mutation-input'
import type { SyncOutboxEntry } from './types/sync-outbox-entry'
import { SyncOutboxStatusEnum } from './types/sync-outbox-status-enum'

interface SyncOutboxRow {
  mutation_id: string
  latest_mutation_id: string
  workspace_id: string
  entity_kind: SyncOutboxEntry['entityKind']
  entity_id: string
  logical_key: string
  intent: SyncOutboxEntry['intent']
  base_hash: string | null
  target_hash: string
  originating_device_id: string
  status: SyncOutboxStatusEnum
  attempt_count: number
  next_attempt_at: string | null
  last_failure_classification: string | null
  claim_token: string | null
  claimed_by: string | null
  claim_expires_at: string | null
  coalesced_count: number
  created_at: string
  updated_at: string
  completed_at: string | null
}

@Injectable()
export class SyncOutboxRepository {
  constructor(
    @Inject(DatabaseService) private readonly databaseService: DatabaseService
  ) {}

  findAll(): SyncOutboxEntry[] {
    return (
      this.getDatabase()
        .prepare(
          'SELECT * FROM sync_outbox ORDER BY created_at ASC, mutation_id ASC'
        )
        .all() as SyncOutboxRow[]
    ).map((row) => this.mapRow(row))
  }

  claimAvailable(options: ClaimSyncOutboxOptions): SyncOutboxEntry[] {
    if (!Number.isInteger(options.limit) || options.limit < 1) {
      throw new Error('Outbox claim limit must be a positive integer.')
    }
    if (
      !Number.isInteger(options.leaseDurationMs) ||
      options.leaseDurationMs < 1
    ) {
      throw new Error('Outbox lease duration must be a positive integer.')
    }

    const database = this.getDatabase()
    const now = options.now ?? new Date()
    const nowIso = now.toISOString()
    const claimExpiresAt = new Date(
      now.getTime() + options.leaseDurationMs
    ).toISOString()
    const claimEntries = database.transaction(() => {
      database
        .prepare(
          `
          UPDATE sync_outbox
          SET status = 'superseded',
              claim_token = NULL,
              claimed_by = NULL,
              claim_expires_at = NULL,
              updated_at = @now
          WHERE status = 'claimed'
            AND claim_expires_at <= @now
            AND EXISTS (
              SELECT 1 FROM sync_outbox AS pending
              WHERE pending.workspace_id = sync_outbox.workspace_id
                AND pending.logical_key = sync_outbox.logical_key
                AND pending.status = 'pending'
            )
        `
        )
        .run({ now: nowIso })

      const rows = database
        .prepare(
          `
          SELECT mutation_id FROM sync_outbox
          WHERE (
              status = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= @now)
            ) OR (
              status = 'claimed' AND claim_expires_at <= @now
            )
          ORDER BY created_at ASC, mutation_id ASC
          LIMIT @limit
        `
        )
        .all({ now: nowIso, limit: options.limit }) as Array<{
        mutation_id: string
      }>
      const claim = database.prepare(`
        UPDATE sync_outbox
        SET status = 'claimed',
            attempt_count = attempt_count + 1,
            claim_token = @claimToken,
            claimed_by = @claimedBy,
            claim_expires_at = @claimExpiresAt,
            updated_at = @updatedAt
        WHERE mutation_id = @mutationId
          AND (
            (status = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= @updatedAt)) OR
            (status = 'claimed' AND claim_expires_at <= @updatedAt)
          )
      `)
      const mutationIds: string[] = []

      for (const row of rows) {
        const result = claim.run({
          mutationId: row.mutation_id,
          claimToken: uuidV4(),
          claimedBy: options.claimedBy,
          claimExpiresAt,
          updatedAt: nowIso,
        })
        if (result.changes > 0) {
          mutationIds.push(row.mutation_id)
        }
      }

      if (mutationIds.length === 0) {
        return []
      }

      return database
        .prepare(
          `SELECT * FROM sync_outbox WHERE mutation_id IN (${mutationIds
            .map(() => '?')
            .join(', ')}) ORDER BY created_at ASC, mutation_id ASC`
        )
        .all(...mutationIds) as SyncOutboxRow[]
    })

    return claimEntries().map((row) => this.mapRow(row))
  }

  renewClaim(
    mutationId: string,
    claimToken: string,
    leaseDurationMs: number,
    now = new Date()
  ): boolean {
    if (!Number.isInteger(leaseDurationMs) || leaseDurationMs < 1) {
      throw new Error('Outbox lease duration must be a positive integer.')
    }

    const nowIso = now.toISOString()
    const claimExpiresAt = new Date(
      now.getTime() + leaseDurationMs
    ).toISOString()

    return (
      this.getDatabase()
        .prepare(
          `UPDATE sync_outbox
           SET claim_expires_at = @claimExpiresAt, updated_at = @now
           WHERE mutation_id = @mutationId
             AND status = 'claimed'
             AND claim_token = @claimToken
             AND claim_expires_at > @now`
        )
        .run({ mutationId, claimToken, claimExpiresAt, now: nowIso }).changes >
      0
    )
  }
  complete(
    mutationId: string,
    claimToken: string,
    completedAt = new Date().toISOString()
  ): boolean {
    const result = this.getDatabase()
      .prepare(
        `
        UPDATE sync_outbox
        SET status = 'completed',
            claim_token = NULL,
            claimed_by = NULL,
            claim_expires_at = NULL,
            completed_at = @completedAt,
            updated_at = @completedAt
        WHERE mutation_id = @mutationId
          AND status = 'claimed'
          AND claim_token = @claimToken
      `
      )
      .run({ mutationId, claimToken, completedAt })

    if (result.changes > 0) {
      return true
    }

    const existing = this.getDatabase()
      .prepare(
        `SELECT 1 FROM sync_outbox
         WHERE mutation_id = ? AND status = 'completed'`
      )
      .get(mutationId)

    return Boolean(existing)
  }

  fail(input: FailSyncOutboxMutationInput): boolean {
    const database = this.getDatabase()
    const failedAt = input.failedAt ?? new Date().toISOString()
    const failMutation = database.transaction(() => {
      const claimed = database
        .prepare(
          `SELECT workspace_id, logical_key FROM sync_outbox
           WHERE mutation_id = ? AND status = 'claimed' AND claim_token = ?`
        )
        .get(input.mutationId, input.claimToken) as
        { workspace_id: string; logical_key: string } | undefined

      if (!claimed) {
        return false
      }

      const newerPending = database
        .prepare(
          `SELECT 1 FROM sync_outbox
           WHERE workspace_id = ? AND logical_key = ? AND status = 'pending'`
        )
        .get(claimed.workspace_id, claimed.logical_key)
      const status = newerPending
        ? SyncOutboxStatusEnum.Superseded
        : SyncOutboxStatusEnum.Pending

      return (
        database
          .prepare(
            `
            UPDATE sync_outbox
            SET status = @status,
                next_attempt_at = CASE WHEN @status = 'pending' THEN @nextAttemptAt ELSE NULL END,
                last_failure_classification = @failureClassification,
                claim_token = NULL,
                claimed_by = NULL,
                claim_expires_at = NULL,
                updated_at = @failedAt
            WHERE mutation_id = @mutationId
              AND status = 'claimed'
              AND claim_token = @claimToken
          `
          )
          .run({ ...input, failedAt, status }).changes > 0
      )
    })

    return failMutation()
  }

  private mapRow(row: SyncOutboxRow): SyncOutboxEntry {
    return {
      mutationId: row.mutation_id,
      latestMutationId: row.latest_mutation_id,
      workspaceId: row.workspace_id,
      entityKind: row.entity_kind,
      entityId: row.entity_id,
      logicalKey: row.logical_key,
      intent: row.intent,
      baseHash: row.base_hash,
      targetHash: row.target_hash,
      originatingDeviceId: row.originating_device_id,
      status: row.status,
      attemptCount: row.attempt_count,
      nextAttemptAt: row.next_attempt_at,
      lastFailureClassification: row.last_failure_classification,
      claimToken: row.claim_token,
      claimedBy: row.claimed_by,
      claimExpiresAt: row.claim_expires_at,
      coalescedCount: row.coalesced_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
    }
  }

  private getDatabase(): Database {
    return this.databaseService.getConnection()
  }
}
