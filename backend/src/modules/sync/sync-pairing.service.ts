import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { RuntimeDiagnosticsService } from '../runtime-diagnostics/runtime-diagnostics.service'
import { SyncOrchestrationRepository } from './sync-orchestration.repository'
import { SyncPairingRepository } from './sync-pairing.repository'
import { SyncProviderFactory } from './sync-provider.factory'
import { SyncReconciliationService } from './sync-reconciliation.service'
import type { ConfirmSyncPairingDto } from './types/confirm-sync-pairing.dto'
import type { PrepareSyncPairingDto } from './types/prepare-sync-pairing.dto'
import type { SyncPairingDecisionEnum } from './types/sync-pairing-decision-enum'
import { SyncPairingModeEnum } from './types/sync-pairing-mode-enum'
import type { SyncPairingOperation } from './types/sync-pairing-operation'
import { SyncPairingOperationTypeEnum } from './types/sync-pairing-operation-type-enum'
import { SyncPairingStatusEnum } from './types/sync-pairing-status-enum'
import { SyncEntityKindEnum } from './types/sync-entity-kind-enum'
import type { SyncProviderAdapter } from './types/sync-provider-adapter'
import type { SyncProviderAvailabilityDto } from './types/sync-provider-availability.dto'
import { SyncProviderEnum } from './types/sync-provider-enum'
import type { SyncProviderFactoryContract } from './types/sync-provider-factory-contract'
import { createWorkspaceSyncDocument } from './utils/create-workspace-sync-document.util'

const PAIRING_BACKUP_NAME = 'before-sync-pairing'

@Injectable()
export class SyncPairingService implements OnModuleInit {
  constructor(
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService,
    @Inject(SyncPairingRepository)
    private readonly repository: SyncPairingRepository,
    @Inject(SyncOrchestrationRepository)
    private readonly orchestrationRepository: SyncOrchestrationRepository,
    @Inject(SyncReconciliationService)
    private readonly reconciliationService: SyncReconciliationService,
    @Inject(SyncProviderFactory)
    private readonly providerFactory: SyncProviderFactoryContract,
    @Inject(RuntimeDiagnosticsService)
    private readonly runtimeDiagnostics: RuntimeDiagnosticsService
  ) {}

  onModuleInit(): void {
    const operation = this.repository.findActive()
    if (
      !operation ||
      operation.status !== SyncPairingStatusEnum.Applying ||
      !operation.decision
    ) {
      return
    }

    if (operation.backupPath) {
      this.databaseService.restoreVerifiedBackup(operation.backupPath)
      this.repository.setApplying(
        operation.id,
        operation.decision,
        operation.backupPath
      )
    }
    this.repository.fail(operation.id, 'pairing-interrupted')
  }

  getProviderAvailability(): SyncProviderAvailabilityDto[] {
    return [
      { provider: SyncProviderEnum.GoogleDrive, available: true },
      { provider: SyncProviderEnum.OneDrive, available: true },
    ]
  }

  async prepare(input: PrepareSyncPairingDto): Promise<SyncPairingOperation> {
    if (this.repository.findActive()) {
      throw new ConflictException(
        'A synchronization pairing operation is already active.'
      )
    }
    const account = this.orchestrationRepository.getAccountState()
    const identity = this.repository.getWorkspaceIdentity()
    const operationType = account.activeProvider
      ? SyncPairingOperationTypeEnum.Switch
      : SyncPairingOperationTypeEnum.Pair
    const pendingMutationCount =
      this.orchestrationRepository.countPendingMutations()

    if (
      operationType === SyncPairingOperationTypeEnum.Switch &&
      pendingMutationCount > 0 &&
      !input.retainPendingWork
    ) {
      throw new ConflictException(
        'Pending synchronization work must be settled or explicitly retained before switching providers.'
      )
    }

    const adapter = this.providerFactory.create(
      input.provider,
      identity.workspaceId
    )
    const providerIdentity = await adapter.getIdentity()
    this.assertAccount(input.expectedAccountId, providerIdentity.accountId)
    if (
      account.activeProvider === input.provider &&
      account.providerAccountId &&
      account.providerAccountId !== providerIdentity.accountId
    ) {
      throw new ConflictException(
        'The connected provider account does not match the bound synchronization account.'
      )
    }

    const workspaces = await adapter.listWorkspaces()
    const localWorkspace = workspaces.find(
      (workspace) => workspace.providerWorkspaceId === identity.workspaceId
    )
    const selectedWorkspace = input.workspaceId
      ? workspaces.find(
          (workspace) => workspace.providerWorkspaceId === input.workspaceId
        )
      : undefined
    if (input.workspaceId && !selectedWorkspace) {
      throw new ConflictException(
        'The selected NoteStack workspace is not available from this provider.'
      )
    }

    let remoteWorkspace = selectedWorkspace ?? localWorkspace ?? null
    if (!remoteWorkspace && workspaces.length === 1) {
      remoteWorkspace = workspaces[0]
    }
    if (!remoteWorkspace && workspaces.length > 1) {
      throw new ConflictException(
        'The provider contains multiple NoteStack workspaces; select one explicitly.'
      )
    }

    let remoteIsPopulated = false
    if (remoteWorkspace) {
      await adapter.discoverWorkspace(remoteWorkspace.providerWorkspaceId)
      remoteIsPopulated = await this.hasRemoteObjects(adapter)
    }

    const localIsPopulated = this.repository.isLocalPopulated()
    const mode = this.resolveMode(
      localIsPopulated,
      remoteIsPopulated,
      remoteWorkspace?.providerWorkspaceId === identity.workspaceId,
      Boolean(remoteWorkspace)
    )

    return this.repository.create({
      operationType,
      targetProvider: input.provider,
      accountId: providerIdentity.accountId,
      accountDisplayName: providerIdentity.accountDisplayName,
      localWorkspaceId: identity.workspaceId,
      remoteWorkspaceId: remoteWorkspace?.providerWorkspaceId ?? null,
      remoteWorkspaceDisplayName: remoteWorkspace?.displayName ?? null,
      mode,
      localIsPopulated,
      remoteIsPopulated,
      pendingMutationCount,
      retainPendingWork: input.retainPendingWork ?? false,
      previousProvider: account.activeProvider,
      previousAccountId: account.providerAccountId,
    })
  }

  get(id: string): SyncPairingOperation {
    const operation = this.repository.findById(id)
    if (!operation) {
      throw new NotFoundException(
        `Synchronization pairing operation ${id} was not found.`
      )
    }

    return operation
  }

  async confirm(
    id: string,
    input: ConfirmSyncPairingDto
  ): Promise<SyncPairingOperation> {
    return this.reconciliationService.executeExclusive(async () => {
      const prepared = this.get(id)
      if (prepared.status !== SyncPairingStatusEnum.Prepared) {
        throw new ConflictException('Only a prepared pairing can be confirmed.')
      }
      this.assertDecision(prepared.mode, input.decision)

      let backupPath: string | null = null

      try {
        backupPath =
          this.databaseService.createVerifiedBackup(PAIRING_BACKUP_NAME)
        const applying = this.repository.setApplying(
          id,
          input.decision,
          backupPath
        )
        if (applying.status !== SyncPairingStatusEnum.Applying) {
          throw new ConflictException(
            'The pairing operation could not be claimed for confirmation.'
          )
        }

        await this.apply(prepared, input.decision)
        return this.repository.complete(id)
      } catch (error) {
        if (!backupPath) {
          throw error
        }

        const errorCode = this.classifyFailure(error)

        this.runtimeDiagnostics.recordPairingFailure({
          error,
          errorCode,
          operation: 'confirm',
          provider: prepared.targetProvider,
        })

        this.databaseService.restoreVerifiedBackup(backupPath)
        const restoredApplying = this.repository.setApplying(
          id,
          input.decision,
          backupPath
        )
        if (restoredApplying.status !== SyncPairingStatusEnum.Applying) {
          throw new ConflictException(
            'The restored pairing operation could not be marked as failed.'
          )
        }

        return this.repository.fail(id, errorCode)
      }
    })
  }

  async cancel(id: string): Promise<SyncPairingOperation> {
    return this.reconciliationService.executeExclusive(async () => {
      const operation = this.get(id)
      if (operation.status !== SyncPairingStatusEnum.Prepared) {
        throw new ConflictException('Only a prepared pairing can be cancelled.')
      }

      return this.repository.cancel(id)
    })
  }

  async enable(): Promise<void> {
    const account = this.orchestrationRepository.getAccountState()
    if (!account.activeProvider || !account.providerWorkspaceId) {
      throw new ConflictException(
        'Synchronization can only be re-enabled for a paired workspace.'
      )
    }

    await this.reconciliationService.executeExclusive(async () => {
      this.repository.setEnabled(true)
    })
  }

  async disable(): Promise<void> {
    await this.reconciliationService.executeExclusive(async () => {
      this.repository.setEnabled(false)
    })
  }
  async disconnect(): Promise<void> {
    await this.reconciliationService.executeExclusive(async () => {
      this.repository.disconnect()
    })
  }
  async repair(): Promise<void> {
    const account = this.orchestrationRepository.getAccountState()
    if (!account.isEnabled) {
      throw new ConflictException(
        'Synchronization must be enabled before it can be repaired.'
      )
    }
    if (!account.activeProvider || !account.providerWorkspaceId) {
      throw new ConflictException(
        'Synchronization repair requires an active provider binding.'
      )
    }

    const adapter = this.providerFactory.create(
      account.activeProvider,
      account.workspaceId
    )
    const identity = await adapter.getIdentity()
    if (
      account.providerAccountId &&
      identity.accountId !== account.providerAccountId
    ) {
      throw new ConflictException(
        'The connected provider account does not match the bound synchronization account.'
      )
    }

    const workspace = await adapter.discoverWorkspace(
      account.providerWorkspaceId
    )
    if (!workspace) {
      throw new ConflictException(
        'The bound provider workspace is missing and requires reset or provider switching.'
      )
    }

    await this.reconciliationService.executeExclusive(async () => {
      this.orchestrationRepository.invalidateActiveCursor('manual-repair')
      await this.reconciliationService.runWithinExclusive(adapter, {
        claimedBy: 'pairing:repair',
      })
    })
  }

  async reset(): Promise<void> {
    await this.reconciliationService.executeExclusive(async () => {
      this.databaseService.createVerifiedBackup('before-sync-reset')
      this.repository.resetSynchronizationState()
    })
  }

  private async apply(
    operation: SyncPairingOperation,
    decision: SyncPairingDecisionEnum
  ): Promise<void> {
    const adapter = this.providerFactory.create(
      operation.targetProvider,
      operation.localWorkspaceId
    )
    const identity = await adapter.getIdentity()
    this.assertAccount(operation.accountId, identity.accountId)

    const usesRemoteWorkspace = ['restore', 'merge', 'replace-local'].includes(
      decision
    )
    let workspaceId = operation.localWorkspaceId
    let workspaceDisplayName = operation.remoteWorkspaceDisplayName

    if (usesRemoteWorkspace) {
      if (!operation.remoteWorkspaceId) {
        throw new ConflictException(
          'The remote workspace is no longer available.'
        )
      }
      workspaceId = operation.remoteWorkspaceId
      const discovered = await adapter.discoverWorkspace(workspaceId)
      if (!discovered) {
        throw new ConflictException('The remote workspace was removed.')
      }
      workspaceDisplayName = discovered.displayName

      if (decision === 'restore' || decision === 'replace-local') {
        this.repository.clearLocalSynchronizedData()
      }
      this.repository.adoptWorkspace(workspaceId)
    } else {
      const workspace = await adapter.createWorkspace(workspaceId)
      workspaceDisplayName = workspace.displayName
      await this.ensureWorkspaceDocument(adapter, workspaceId)
    }

    if (
      decision === 'seed' ||
      decision === 'replace-remote' ||
      decision === 'reconcile' ||
      decision === 'merge'
    ) {
      this.repository.createResolvedBaseline(
        operation.targetProvider,
        workspaceId,
        operation.retainPendingWork
      )
    }

    await this.reconciliationService.runWithinExclusive(
      adapter,
      { claimedBy: `pairing:${operation.id}` },
      {
        workspaceId,
        deviceId: this.repository.getWorkspaceIdentity().deviceId,
        provider: operation.targetProvider,
      }
    )

    const verifiedWorkspace = await adapter.discoverWorkspace(workspaceId)
    if (!verifiedWorkspace) {
      throw new ConflictException(
        'The reconciled workspace could not be verified.'
      )
    }

    this.repository.bind(
      operation.targetProvider,
      identity.accountId,
      identity.accountDisplayName,
      workspaceId,
      workspaceDisplayName
    )
  }

  private async ensureWorkspaceDocument(
    adapter: SyncProviderAdapter,
    workspaceId: string
  ): Promise<void> {
    const page = await adapter.enumerateObjects()
    if (page.objects.some((object) => object.logicalKey === 'workspace.json')) {
      return
    }

    const identity = this.repository.getWorkspaceIdentity()
    const document = createWorkspaceSyncDocument(workspaceId, identity.deviceId)
    await adapter.createDocument(
      document.logicalKey,
      SyncEntityKindEnum.Workspace,
      document.canonicalJson
    )
  }

  private async hasRemoteObjects(
    adapter: SyncProviderAdapter
  ): Promise<boolean> {
    let pageToken: string | undefined

    do {
      const page = await adapter.enumerateObjects(pageToken)
      if (page.objects.length > 0) {
        return true
      }
      pageToken = page.nextPageToken ?? undefined
    } while (pageToken)

    return false
  }

  private resolveMode(
    localIsPopulated: boolean,
    remoteIsPopulated: boolean,
    isSameWorkspace: boolean,
    hasRemoteWorkspace: boolean
  ): SyncPairingModeEnum {
    if (!remoteIsPopulated) {
      return SyncPairingModeEnum.Seed
    }
    if (!localIsPopulated) {
      return SyncPairingModeEnum.Restore
    }
    if (isSameWorkspace) {
      return SyncPairingModeEnum.Reconcile
    }
    if (hasRemoteWorkspace) {
      return SyncPairingModeEnum.Mismatch
    }

    return SyncPairingModeEnum.Seed
  }

  private assertDecision(
    mode: SyncPairingModeEnum,
    decision: SyncPairingDecisionEnum
  ): void {
    const allowed: Record<SyncPairingModeEnum, string[]> = {
      [SyncPairingModeEnum.Seed]: ['seed'],
      [SyncPairingModeEnum.Restore]: ['restore'],
      [SyncPairingModeEnum.Reconcile]: ['reconcile'],
      [SyncPairingModeEnum.Mismatch]: [
        'merge',
        'replace-local',
        'replace-remote',
      ],
    }
    if (!allowed[mode].includes(decision)) {
      throw new ConflictException(
        `Decision ${decision} is not valid for pairing mode ${mode}.`
      )
    }
  }

  private assertAccount(expected: string | undefined, actual: string): void {
    if (expected && expected !== actual) {
      throw new ConflictException(
        'The connected provider account does not match the expected account.'
      )
    }
  }

  private classifyFailure(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error)
    if (/newer application version/i.test(message)) {
      return 'unsupported-remote-version'
    }
    if (/account/i.test(message)) {
      return 'account-mismatch'
    }
    if (/missing|removed|not found/i.test(message)) {
      return 'remote-missing'
    }

    return 'pairing-failed'
  }
}
