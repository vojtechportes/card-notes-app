import {
  ONE_DRIVE_ADAPTER_VERSION,
  ONE_DRIVE_RESUMABLE_THRESHOLD,
} from './constants/one-drive.constants'
import { OneDriveFileService } from './one-drive-file.service'
import { OneDriveHttpClient } from './one-drive-http-client'
import { OneDriveObjectService } from './one-drive-object.service'
import { OneDriveWorkspaceService } from './one-drive-workspace.service'
import type { OneDriveAdapterOptions } from './types/one-drive-adapter-options'
import { SyncEntityKindEnum } from '../types/sync-entity-kind-enum'
import type { SyncProviderAdapter } from '../types/sync-provider-adapter'
import type { SyncProviderChangePage } from '../types/sync-provider-change-page'
import type { SyncProviderEnumerationPage } from '../types/sync-provider-enumeration-page'
import { SyncProviderError } from '../types/sync-provider-error'
import { SyncProviderErrorKindEnum } from '../types/sync-provider-error-kind-enum'
import type { SyncProviderIdentity } from '../types/sync-provider-identity'
import type { SyncProviderObjectMetadata } from '../types/sync-provider-object-metadata'
import type { SyncProviderReadResult } from '../types/sync-provider-read-result'
import type { SyncProviderWorkspace } from '../types/sync-provider-workspace'
import type { SyncProviderWriteResult } from '../types/sync-provider-write-result'

export class OneDriveSyncProviderAdapter implements SyncProviderAdapter {
  private readonly fileService: OneDriveFileService
  private readonly identityProvider: OneDriveAdapterOptions['identityProvider']
  private readonly objectService: OneDriveObjectService
  private readonly workspaceService: OneDriveWorkspaceService
  private readonly enumeratedObjectIds = new Map<string, string>()
  private activeWorkspaceId: string | null
  private activeRootId: string | null = null

  constructor(options: OneDriveAdapterOptions) {
    const httpClient = new OneDriveHttpClient(
      options.accessTokenProvider,
      options.fetch
    )
    this.fileService = new OneDriveFileService(httpClient, options.retryDelay)
    this.identityProvider = options.identityProvider
    this.workspaceService = new OneDriveWorkspaceService(this.fileService)
    this.objectService = new OneDriveObjectService(
      this.fileService,
      options.objectMappingReader,
      options.resumableThreshold ?? ONE_DRIVE_RESUMABLE_THRESHOLD
    )
    this.activeWorkspaceId = options.workspaceId ?? null
  }

  async getIdentity(): Promise<SyncProviderIdentity> {
    let identity

    try {
      identity = this.identityProvider
        ? await this.identityProvider()
        : await this.workspaceService.getAccountIdentity()
    } catch {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Authentication,
        'OneDrive account identity is unavailable.'
      )
    }

    if (!identity.accountId) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Permanent,
        'OneDrive account identity is invalid.'
      )
    }

    return {
      providerName: 'one-drive',
      accountId: identity.accountId,
      accountDisplayName: identity.displayName,
      adapterVersion: ONE_DRIVE_ADAPTER_VERSION,
    }
  }

  async listWorkspaces(): Promise<SyncProviderWorkspace[]> {
    return this.workspaceService.list()
  }

  async discoverWorkspace(
    workspaceId: string
  ): Promise<SyncProviderWorkspace | null> {
    const workspace = await this.workspaceService.discover(workspaceId)
    if (workspace) {
      this.activateWorkspace(
        workspaceId,
        await this.workspaceService.getAppRootId()
      )
    }

    return workspace
  }

  async createWorkspace(workspaceId: string): Promise<SyncProviderWorkspace> {
    const workspace = await this.workspaceService.create(workspaceId)
    this.activateWorkspace(
      workspaceId,
      await this.workspaceService.getAppRootId()
    )

    return workspace
  }

  async enumerateObjects(
    pageToken?: string
  ): Promise<SyncProviderEnumerationPage> {
    const rootId = await this.requireRootId()
    if (!pageToken) {
      this.enumeratedObjectIds.clear()
      this.objectService.clearCache()
    }

    const page = await this.fileService.listDelta(rootId, pageToken)
    const objects: SyncProviderObjectMetadata[] = []

    for (const item of page.value ?? []) {
      if (item.deleted || item.folder) {
        continue
      }

      const hydrated = await this.objectService.hydrateItem(item, rootId)
      if (!hydrated) {
        continue
      }

      const metadata = await this.objectService.resolveCanonicalObject(
        rootId,
        hydrated.logicalKey
      )
      if (!metadata) {
        continue
      }

      const duplicateId = this.enumeratedObjectIds.get(metadata.logicalKey)
      if (duplicateId === metadata.providerObjectId) {
        continue
      }
      if (duplicateId) {
        throw new SyncProviderError(
          SyncProviderErrorKindEnum.Permanent,
          `OneDrive canonical object changed during enumeration: ${metadata.logicalKey}`
        )
      }

      this.enumeratedObjectIds.set(
        metadata.logicalKey,
        metadata.providerObjectId
      )
      objects.push(metadata)
    }

    const nextPageToken = page['@odata.nextLink'] ?? null
    const candidateCursor = page['@odata.deltaLink'] ?? nextPageToken
    if (!candidateCursor) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Permanent,
        'OneDrive delta enumeration did not return a continuation link.'
      )
    }

    return { objects, nextPageToken, candidateCursor }
  }

  async listChanges(
    cursor: string,
    pageToken?: string
  ): Promise<SyncProviderChangePage> {
    const workspaceId = this.requireWorkspaceId()
    const rootId = await this.requireRootId()
    const page = await this.fileService.listDelta(rootId, pageToken ?? cursor)
    const changes: SyncProviderObjectMetadata[] = []

    for (const item of page.value ?? []) {
      let metadata: SyncProviderObjectMetadata | null
      if (item.deleted) {
        metadata = await this.objectService.getDeletedMetadata(
          workspaceId,
          rootId,
          item
        )
      } else if (item.folder) {
        metadata = null
      } else {
        metadata = await this.objectService.hydrateItem(item, rootId)
        if (metadata) {
          metadata = await this.objectService.resolveCanonicalObject(
            rootId,
            metadata.logicalKey
          )
        }
      }

      if (
        metadata &&
        !changes.some(
          (change) => change.providerObjectId === metadata?.providerObjectId
        )
      ) {
        changes.push(metadata)
      }
    }

    return {
      changes,
      nextPageToken: page['@odata.nextLink'] ?? null,
      candidateCursor: page['@odata.deltaLink'] ?? cursor,
    }
  }

  async readObject(logicalKey: string): Promise<SyncProviderReadResult> {
    return this.objectService.readObject(await this.requireRootId(), logicalKey)
  }

  async createDocument(
    logicalKey: string,
    entityKind: SyncEntityKindEnum,
    canonicalJson: string
  ): Promise<SyncProviderWriteResult> {
    return this.objectService.createDocument(
      await this.requireRootId(),
      logicalKey,
      entityKind,
      canonicalJson
    )
  }

  async updateDocument(
    logicalKey: string,
    entityKind: SyncEntityKindEnum,
    canonicalJson: string,
    expectedVersion: string
  ): Promise<SyncProviderWriteResult> {
    return this.objectService.updateDocument(
      await this.requireRootId(),
      logicalKey,
      entityKind,
      canonicalJson,
      expectedVersion
    )
  }

  async createAsset(
    logicalKey: string,
    bytes: Buffer,
    contentHash: string
  ): Promise<SyncProviderWriteResult> {
    return this.objectService.createAsset(
      await this.requireRootId(),
      logicalKey,
      bytes,
      contentHash
    )
  }

  async updateAsset(
    logicalKey: string,
    bytes: Buffer,
    contentHash: string,
    expectedVersion: string
  ): Promise<SyncProviderWriteResult> {
    return this.objectService.updateAsset(
      await this.requireRootId(),
      logicalKey,
      bytes,
      contentHash,
      expectedVersion
    )
  }
  private activateWorkspace(workspaceId: string, rootId: string): void {
    if (
      this.activeWorkspaceId !== workspaceId ||
      this.activeRootId !== rootId
    ) {
      this.objectService.clearCache()
      this.enumeratedObjectIds.clear()
    }

    this.activeWorkspaceId = workspaceId
    this.activeRootId = rootId
  }

  private requireWorkspaceId(): string {
    if (!this.activeWorkspaceId) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Permanent,
        'A OneDrive workspace must be selected before synchronization.'
      )
    }

    return this.activeWorkspaceId
  }

  private async requireRootId(): Promise<string> {
    this.requireWorkspaceId()
    if (!this.activeRootId) {
      this.activeRootId = await this.workspaceService.getAppRootId()
    }

    return this.activeRootId
  }
}
