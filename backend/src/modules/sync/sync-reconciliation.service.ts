import { Inject, Injectable, Optional } from '@nestjs/common'
import { AssetsService } from '../assets/assets.service'
import { SyncOutboxRepository } from './sync-outbox.repository'
import { SyncReconciliationRepository } from './sync-reconciliation.repository'
import type { ActiveSyncContext } from './types/active-sync-context'
import type { CollectedSyncChanges } from './types/collected-sync-changes'
import type { PendingSyncPushCompletion } from './types/pending-sync-push-completion'
import type { PulledSyncAsset } from './types/pulled-sync-asset'
import type { PulledSyncDocument } from './types/pulled-sync-document'
import { SyncEntityKindEnum } from './types/sync-entity-kind-enum'
import type { SyncProviderAdapter } from './types/sync-provider-adapter'
import { SyncProviderError } from './types/sync-provider-error'
import { SyncProviderErrorKindEnum } from './types/sync-provider-error-kind-enum'
import type { SyncProviderObjectMetadata } from './types/sync-provider-object-metadata'
import type { SyncReconciliationFaultInjector } from './types/sync-reconciliation-fault-injector'
import type { SyncReconciliationOptions } from './types/sync-reconciliation-options'
import type { SyncReconciliationResult } from './types/sync-reconciliation-result'
import type { SyncMergeConflict } from './types/sync-merge-conflict'
import { SyncDocumentQuarantineReasonEnum } from './types/sync-document-quarantine-reason-enum'
import type { SyncRemoteDocument } from './types/sync-remote-document'
import { SyncRemoteDeletionError } from './types/sync-remote-deletion-error'
import { getSyncDocumentParentHash } from './utils/get-sync-document-parent-hash.util'
import { getSyncEntityIdFromLogicalKey } from './utils/get-sync-entity-id-from-logical-key.util'
import { mapSyncDocument } from './utils/map-sync-document.util'
import { mergeSyncDocument } from './utils/merge-sync-document.util'
import { parseRemoteSyncDocument } from './utils/parse-remote-sync-document.util'

const DEFAULT_OUTBOX_LIMIT = 100
const DEFAULT_LEASE_DURATION_MS = 60_000
const DEFAULT_RETRY_DELAY_MS = 5_000

@Injectable()
export class SyncReconciliationService {
  private activeRun: Promise<SyncReconciliationResult> | null = null
  private followUpRequested = false

  constructor(
    @Inject(SyncReconciliationRepository)
    private readonly reconciliationRepository: SyncReconciliationRepository,
    @Inject(SyncOutboxRepository)
    private readonly outboxRepository: SyncOutboxRepository,
    @Inject(AssetsService)
    private readonly assetsService: AssetsService,
    @Optional()
    private readonly faultInjector?: SyncReconciliationFaultInjector
  ) {}

  run(
    adapter: SyncProviderAdapter,
    options: SyncReconciliationOptions
  ): Promise<SyncReconciliationResult> {
    if (this.activeRun) {
      this.followUpRequested = true
      return this.activeRun
    }

    this.activeRun = this.runSerialized(adapter, options).finally(() => {
      this.activeRun = null
    })
    return this.activeRun
  }

  private async runSerialized(
    adapter: SyncProviderAdapter,
    options: SyncReconciliationOptions
  ): Promise<SyncReconciliationResult> {
    const aggregate: SyncReconciliationResult = {
      pulledCount: 0,
      pushedCount: 0,
      downloadedAssetCount: 0,
      uploadedAssetCount: 0,
      cursor: null,
      followUpRun: false,
    }

    do {
      const wasFollowUp = this.followUpRequested
      this.followUpRequested = false
      const result = await this.runOnce(adapter, options)
      aggregate.pulledCount += result.pulledCount
      aggregate.pushedCount += result.pushedCount
      aggregate.downloadedAssetCount += result.downloadedAssetCount
      aggregate.uploadedAssetCount += result.uploadedAssetCount
      aggregate.cursor = result.cursor
      aggregate.followUpRun ||= wasFollowUp
    } while (this.followUpRequested)

    return aggregate
  }

  private async runOnce(
    adapter: SyncProviderAdapter,
    options: SyncReconciliationOptions,
    preconditionRetryCount = 0
  ): Promise<SyncReconciliationResult> {
    const context = this.reconciliationRepository.getActiveContext()
    if (!context) {
      throw new Error('Synchronization requires an enabled, bound workspace.')
    }

    const initialPull = await this.pull(adapter, context, true)
    let claimed = this.outboxRepository.claimAvailable({
      claimedBy: options.claimedBy,
      leaseDurationMs: options.leaseDurationMs ?? DEFAULT_LEASE_DURATION_MS,
      limit: options.outboxLimit ?? DEFAULT_OUTBOX_LIMIT,
      now: options.now,
    })
    claimed = this.recoverAcknowledgedClaims(context, claimed)
    const pushes: PendingSyncPushCompletion[] = []
    let uploadedAssetCount = 0

    try {
      const claimedAssets = claimed.filter(
        (entry) => entry.entityKind === SyncEntityKindEnum.Asset
      )
      for (const entry of claimedAssets) {
        const { buffer } = this.assetsService.readAsset(entry.entityId)
        this.faultInjector?.reach('before-remote-write')
        const writeResult = await adapter.createAsset(
          entry.logicalKey,
          buffer,
          entry.entityId
        )
        this.faultInjector?.reach('after-remote-write')
        pushes.push({ entry, writeResult })
        uploadedAssetCount += 1
      }

      const documents = this.reconciliationRepository.listClaimedDocuments(
        claimed.filter((entry) => entry.entityKind !== SyncEntityKindEnum.Asset)
      )
      for (const claimedDocument of documents) {
        const remote = this.reconciliationRepository.findRemoteState(
          context,
          claimedDocument.entry.logicalKey
        )
        let writeResult
        this.faultInjector?.reach('before-remote-write')
        if (remote) {
          writeResult = await adapter.updateDocument(
            claimedDocument.entry.logicalKey,
            claimedDocument.entry.entityKind,
            claimedDocument.mappedDocument.canonicalJson,
            remote.providerVersion
          )
        } else {
          writeResult = await adapter.createDocument(
            claimedDocument.entry.logicalKey,
            claimedDocument.entry.entityKind,
            claimedDocument.mappedDocument.canonicalJson
          )
        }
        this.faultInjector?.reach('after-remote-write')
        pushes.push({ entry: claimedDocument.entry, writeResult })
      }
    } catch (error) {
      if (
        error instanceof SyncProviderError &&
        error.kind === SyncProviderErrorKindEnum.PreconditionFailed &&
        preconditionRetryCount < 2
      ) {
        await this.failClaims(claimed, error, 0)
        await this.pull(adapter, context, true)
        return this.runOnce(
          adapter,
          { ...options, now: undefined },
          preconditionRetryCount + 1
        )
      }
      await this.failClaims(claimed, error)
      throw error
    }

    const verificationPull = await this.pull(adapter, context, false)
    this.faultInjector?.reach('before-outbox-complete')
    for (const push of pushes) {
      if (!push.entry.claimToken) {
        continue
      }
      this.outboxRepository.complete(
        push.entry.mutationId,
        push.entry.claimToken
      )
    }
    this.faultInjector?.reach('after-outbox-complete')

    return {
      pulledCount: initialPull.pulledCount + verificationPull.pulledCount,
      pushedCount: pushes.length,
      downloadedAssetCount:
        initialPull.downloadedAssetCount +
        verificationPull.downloadedAssetCount,
      uploadedAssetCount,
      cursor: verificationPull.cursor,
      followUpRun: false,
    }
  }

  private async pull(
    adapter: SyncProviderAdapter,
    context: ActiveSyncContext,
    acknowledgeMatchingOutbox: boolean
  ): Promise<{
    pulledCount: number
    downloadedAssetCount: number
    cursor: string
  }> {
    const changes = await this.collectChanges(adapter, context)
    const documents: PulledSyncDocument[] = []
    const assets: PulledSyncAsset[] = []
    let downloadedAssetCount = 0

    for (const metadata of changes.metadata) {
      if (metadata.isDeleted) {
        const remoteState = this.reconciliationRepository.findRemoteState(
          context,
          metadata.logicalKey
        )
        if (remoteState) {
          this.reconciliationRepository.recordRemoteRepairCondition(
            context,
            metadata.logicalKey,
            metadata.entityKind,
            remoteState.entityId,
            '$remote.missing',
            true
          )
          throw new SyncRemoteDeletionError(metadata.logicalKey)
        }
        continue
      }
      if (metadata.entityKind === SyncEntityKindEnum.Asset) {
        const read = await adapter.readObject(metadata.logicalKey)
        const assetId = this.getAssetId(metadata.logicalKey)
        this.assetsService.storeSynchronizedImage(read.bytes, assetId)
        assets.push({
          assetId,
          metadata: {
            ...metadata,
            providerObjectId: read.providerObjectId,
            providerVersion: read.providerVersion,
          },
        })
        downloadedAssetCount += 1
        continue
      }

      const read = await adapter.readObject(metadata.logicalKey)
      const parsed = parseRemoteSyncDocument(
        metadata.logicalKey,
        read.bytes.toString('utf8'),
        { expectedWorkspaceId: context.workspaceId }
      )
      if (parsed.status === 'quarantined') {
        if (
          parsed.reason ===
          SyncDocumentQuarantineReasonEnum.UnsupportedFormatVersion
        ) {
          throw new Error(
            `Remote document ${metadata.logicalKey} requires a newer application version.`
          )
        }

        const knownState = this.reconciliationRepository.findRemoteState(
          context,
          metadata.logicalKey
        )
        const entityId =
          knownState?.entityId ??
          getSyncEntityIdFromLogicalKey(
            metadata.logicalKey,
            metadata.entityKind
          )

        const repairScheduled =
          this.reconciliationRepository.recordRemoteRepairCondition(
            context,
            metadata.logicalKey,
            metadata.entityKind,
            entityId,
            `$remote.${parsed.reason}`,
            false,
            read.providerObjectId,
            read.providerVersion
          )
        if (!repairScheduled) {
          throw new Error(
            `Remote document ${metadata.logicalKey} was quarantined: ${parsed.reason}`
          )
        }

        continue
      }

      const remoteState = this.reconciliationRepository.findRemoteState(
        context,
        metadata.logicalKey
      )
      const baseDocument = remoteState?.mergeBaseJson
        ? (JSON.parse(remoteState.mergeBaseJson) as SyncRemoteDocument)
        : null
      const entityId =
        'entityId' in parsed.mappedDocument.document
          ? parsed.mappedDocument.document.entityId
          : parsed.mappedDocument.document.workspaceId
      const baseParentHash = getSyncDocumentParentHash(baseDocument)
      const localDocument = this.reconciliationRepository.createLocalDocument(
        context,
        metadata.entityKind,
        entityId,
        baseParentHash
      )
      const remoteParentHash =
        'parentHash' in parsed.mappedDocument.document
          ? parsed.mappedDocument.document.parentHash
          : null
      const localDocumentWithRemoteParent =
        localDocument && remoteParentHash !== baseParentHash
          ? this.reconciliationRepository.createLocalDocument(
              context,
              metadata.entityKind,
              entityId,
              remoteParentHash
            )
          : localDocument

      let applyToDomain = false
      let acknowledgeOutbox = false
      let enqueueMergedDocument = false
      let domainMappedDocument = parsed.mappedDocument
      let conflicts: SyncMergeConflict[] = []

      if (!remoteState) {
        if (
          localDocument &&
          localDocument.contentHash !== parsed.mappedDocument.contentHash
        ) {
          const mergeResult = mergeSyncDocument(
            null,
            localDocument.document,
            parsed.mappedDocument.document
          )
          domainMappedDocument = mapSyncDocument(mergeResult.document)
          conflicts = mergeResult.conflicts
          applyToDomain = true
          enqueueMergedDocument =
            domainMappedDocument.contentHash !==
            parsed.mappedDocument.contentHash
        } else {
          applyToDomain = !localDocument
          acknowledgeOutbox =
            acknowledgeMatchingOutbox && Boolean(localDocument)
        }
      } else if (
        parsed.mappedDocument.contentHash === remoteState.contentHash
      ) {
        applyToDomain = false
      } else if (localDocument?.contentHash === remoteState.contentHash) {
        applyToDomain = true
      } else if (
        localDocument?.contentHash === parsed.mappedDocument.contentHash
      ) {
        acknowledgeOutbox = acknowledgeMatchingOutbox
      } else if (localDocument) {
        const mergeResult = mergeSyncDocument(
          baseDocument,
          localDocument.document,
          parsed.mappedDocument.document
        )
        domainMappedDocument = mapSyncDocument(mergeResult.document)
        conflicts = mergeResult.conflicts
        applyToDomain = true
        enqueueMergedDocument =
          domainMappedDocument.contentHash !== parsed.mappedDocument.contentHash
        acknowledgeOutbox = acknowledgeMatchingOutbox && !enqueueMergedDocument
      } else {
        applyToDomain = true
      }

      documents.push({
        mappedDocument: parsed.mappedDocument,
        domainMappedDocument,
        conflicts,
        metadata: {
          ...metadata,
          providerObjectId: read.providerObjectId,
          providerVersion: read.providerVersion,
        },
        applyToDomain,
        acknowledgeOutbox,
        enqueueMergedDocument,
      })
    }

    this.faultInjector?.reach('before-local-apply')
    this.reconciliationRepository.applyPull(
      context,
      documents,
      assets,
      changes.candidateCursor,
      changes.wasFullEnumeration,
      {
        afterLocalApply: () => this.faultInjector?.reach('after-local-apply'),
        beforeCursorCommit: () =>
          this.faultInjector?.reach('before-cursor-commit'),
      }
    )
    this.faultInjector?.reach('after-cursor-commit')

    return {
      pulledCount: documents.length,
      downloadedAssetCount,
      cursor: changes.candidateCursor,
    }
  }

  private async collectChanges(
    adapter: SyncProviderAdapter,
    context: ActiveSyncContext
  ): Promise<CollectedSyncChanges> {
    const cursorState = this.reconciliationRepository.getCursor(context)
    const useEnumeration = !cursorState?.cursor || cursorState.isInvalidated
    const metadata: SyncProviderObjectMetadata[] = []
    let pageToken: string | undefined
    let candidateCursor = cursorState?.cursor ?? '0'

    try {
      do {
        if (useEnumeration) {
          const page = await adapter.enumerateObjects(pageToken)
          metadata.push(...page.objects)
          pageToken = page.nextPageToken ?? undefined
          candidateCursor = page.candidateCursor
        } else {
          const page = await adapter.listChanges(cursorState.cursor!, pageToken)
          metadata.push(...page.changes)
          pageToken = page.nextPageToken ?? undefined
          candidateCursor = page.candidateCursor
        }
      } while (pageToken)
    } catch (error) {
      if (
        error instanceof SyncProviderError &&
        error.kind === SyncProviderErrorKindEnum.InvalidCursor &&
        !useEnumeration
      ) {
        this.reconciliationRepository.invalidateCursor(
          context,
          SyncProviderErrorKindEnum.InvalidCursor
        )
        return this.collectChanges(adapter, context)
      }
      throw error
    }

    if (useEnumeration) {
      const enumeratedKeys = new Set(
        metadata
          .filter((object) => !object.isDeleted)
          .map((object) => object.logicalKey)
      )
      const missingObject = this.reconciliationRepository
        .listRemoteStates(context)
        .find((remote) => !enumeratedKeys.has(remote.logicalKey))
      if (missingObject) {
        this.reconciliationRepository.recordRemoteRepairCondition(
          context,
          missingObject.logicalKey,
          missingObject.entityKind,
          missingObject.entityId,
          '$remote.missing',
          true
        )
        throw new SyncRemoteDeletionError(missingObject.logicalKey)
      }
    }

    return { metadata, candidateCursor, wasFullEnumeration: useEnumeration }
  }

  private recoverAcknowledgedClaims(
    context: ActiveSyncContext,
    entries: PendingSyncPushCompletion['entry'][]
  ): PendingSyncPushCompletion['entry'][] {
    return entries.filter((entry) => {
      const remote = this.reconciliationRepository.findRemoteState(
        context,
        entry.logicalKey
      )
      if (!remote || !entry.claimToken) {
        return true
      }

      let isAcknowledged = entry.entityKind === SyncEntityKindEnum.Asset
      if (!isAcknowledged && remote.mergeBaseJson) {
        const document = JSON.parse(remote.mergeBaseJson) as {
          mutationId?: unknown
        }
        isAcknowledged = document.mutationId === entry.latestMutationId
      }
      if (!isAcknowledged) {
        return true
      }

      this.outboxRepository.complete(entry.mutationId, entry.claimToken)
      return false
    })
  }
  private async failClaims(
    entries: PendingSyncPushCompletion['entry'][],
    error: unknown,
    retryDelayMs?: number
  ): Promise<void> {
    const providerError = error instanceof SyncProviderError ? error : null
    const retryAfterMs =
      retryDelayMs ?? providerError?.retryAfterMs ?? DEFAULT_RETRY_DELAY_MS
    const failureClassification =
      providerError?.kind ?? SyncProviderErrorKindEnum.Transient
    const nextAttemptAt = new Date(Date.now() + retryAfterMs).toISOString()

    for (const entry of entries) {
      if (!entry.claimToken) {
        continue
      }
      this.outboxRepository.fail({
        mutationId: entry.mutationId,
        claimToken: entry.claimToken,
        failureClassification,
        nextAttemptAt,
      })
    }
  }

  private getAssetId(logicalKey: string): string {
    const match = /^assets\/([a-f0-9]{64})\.[a-z0-9]+$/.exec(logicalKey)
    if (!match) {
      throw new Error(`Remote asset logical key is invalid: ${logicalKey}`)
    }
    return match[1]
  }
}
