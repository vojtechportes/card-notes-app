import {
  GOOGLE_DRIVE_ADAPTER_VERSION,
  GOOGLE_DRIVE_RESUMABLE_THRESHOLD,
} from './constants/google-drive.constants'
import { GoogleDriveFileService } from './google-drive-file.service'
import { GoogleDriveHttpClient } from './google-drive-http-client'
import { GoogleDriveObjectService } from './google-drive-object.service'
import { GoogleDriveWorkspaceService } from './google-drive-workspace.service'
import type { GoogleDriveAdapterOptions } from './types/google-drive-adapter-options'
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
import { decodeGoogleDriveEnumerationPageToken } from './utils/decode-google-drive-enumeration-page-token.util'
import { encodeGoogleDriveEnumerationPageToken } from './utils/encode-google-drive-enumeration-page-token.util'
import { createGoogleDriveObjectQuery } from './utils/create-google-drive-object-query.util'

export class GoogleDriveSyncProviderAdapter implements SyncProviderAdapter {
  private readonly fileService: GoogleDriveFileService
  private readonly objectService: GoogleDriveObjectService
  private readonly workspaceService: GoogleDriveWorkspaceService
  private readonly enumeratedObjectIds = new Map<string, string>()
  private activeWorkspaceId: string | null = null

  constructor(options: GoogleDriveAdapterOptions) {
    const httpClient = new GoogleDriveHttpClient(
      options.accessTokenProvider,
      options.fetch
    )
    this.fileService = new GoogleDriveFileService(httpClient)
    this.workspaceService = new GoogleDriveWorkspaceService(this.fileService)
    this.objectService = new GoogleDriveObjectService(
      this.fileService,
      options.objectMappingReader,
      options.resumableThreshold ?? GOOGLE_DRIVE_RESUMABLE_THRESHOLD
    )
    this.activeWorkspaceId = options.workspaceId ?? null
  }

  async getIdentity(): Promise<SyncProviderIdentity> {
    const about = await this.fileService.getAbout()
    const accountId = about.user?.permissionId
    if (!accountId) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Permanent,
        'Google Drive did not return an account identity.'
      )
    }

    return {
      providerName: 'google-drive',
      accountId,
      accountDisplayName: about.user?.displayName ?? null,
      adapterVersion: GOOGLE_DRIVE_ADAPTER_VERSION,
    }
  }

  listWorkspaces(): Promise<SyncProviderWorkspace[]> {
    return this.workspaceService.list()
  }

  async discoverWorkspace(
    workspaceId: string
  ): Promise<SyncProviderWorkspace | null> {
    const workspace = await this.workspaceService.discover(workspaceId)
    if (workspace) {
      this.activateWorkspace(workspaceId)
    }

    return workspace
  }

  async createWorkspace(workspaceId: string): Promise<SyncProviderWorkspace> {
    const workspace = await this.workspaceService.create(workspaceId)
    this.activateWorkspace(workspaceId)
    return workspace
  }

  async enumerateObjects(
    pageToken?: string
  ): Promise<SyncProviderEnumerationPage> {
    const workspaceId = this.requireWorkspaceId()
    let candidateCursor: string
    let providerPageToken: string | undefined

    if (pageToken) {
      const decoded = decodeGoogleDriveEnumerationPageToken(pageToken)
      candidateCursor = decoded.candidateCursor
      providerPageToken = decoded.providerPageToken
    } else {
      candidateCursor = await this.fileService.getStartPageToken()
      this.enumeratedObjectIds.clear()
      this.objectService.clearCache()
    }

    const page = await this.fileService.listFiles(
      createGoogleDriveObjectQuery(workspaceId),
      providerPageToken
    )
    const objects: SyncProviderObjectMetadata[] = []
    for (const file of page.files ?? []) {
      if (file.trashed) {
        continue
      }

      const hydrated = await this.objectService.hydrateFile(file, workspaceId)
      if (!hydrated) {
        continue
      }

      const metadata = await this.objectService.resolveCanonicalObject(
        workspaceId,
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
          `Google Drive canonical object changed during enumeration: ${metadata.logicalKey}`
        )
      }

      this.enumeratedObjectIds.set(
        metadata.logicalKey,
        metadata.providerObjectId
      )
      objects.push(metadata)
    }

    return {
      objects,
      nextPageToken: page.nextPageToken
        ? encodeGoogleDriveEnumerationPageToken({
            candidateCursor,
            providerPageToken: page.nextPageToken,
          })
        : null,
      candidateCursor,
    }
  }

  async listChanges(
    cursor: string,
    pageToken?: string
  ): Promise<SyncProviderChangePage> {
    const workspaceId = this.requireWorkspaceId()
    const page = await this.fileService.listChanges(pageToken ?? cursor)
    const changes: SyncProviderObjectMetadata[] = []

    for (const change of page.changes ?? []) {
      if (change.changeType && change.changeType !== 'file') {
        continue
      }
      if (!change.fileId) {
        throw new SyncProviderError(
          SyncProviderErrorKindEnum.Permanent,
          'Google Drive returned a change without a file ID.'
        )
      }

      if (change.removed || change.file?.trashed) {
        const deleted = await this.objectService.getDeletedMetadata(
          workspaceId,
          change.fileId,
          change.file
        )
        if (deleted) {
          changes.push(deleted)
        }
        continue
      }
      if (!change.file) {
        continue
      }

      const hydrated = await this.objectService.hydrateFile(
        change.file,
        workspaceId
      )
      if (!hydrated) {
        continue
      }

      const metadata = await this.objectService.resolveCanonicalObject(
        workspaceId,
        hydrated.logicalKey
      )
      if (
        metadata &&
        !changes.some(
          (item) => item.providerObjectId === metadata.providerObjectId
        )
      ) {
        changes.push(metadata)
      }
    }

    return {
      changes,
      nextPageToken: page.nextPageToken ?? null,
      candidateCursor: page.newStartPageToken ?? cursor,
    }
  }

  readObject(logicalKey: string): Promise<SyncProviderReadResult> {
    return this.objectService.readObject(this.requireWorkspaceId(), logicalKey)
  }

  createDocument(
    logicalKey: string,
    entityKind: SyncEntityKindEnum,
    canonicalJson: string
  ): Promise<SyncProviderWriteResult> {
    return this.objectService.createDocument(
      this.requireWorkspaceId(),
      logicalKey,
      entityKind,
      canonicalJson
    )
  }

  updateDocument(
    logicalKey: string,
    entityKind: SyncEntityKindEnum,
    canonicalJson: string,
    expectedVersion: string
  ): Promise<SyncProviderWriteResult> {
    return this.objectService.updateDocument(
      this.requireWorkspaceId(),
      logicalKey,
      entityKind,
      canonicalJson,
      expectedVersion
    )
  }

  createAsset(
    logicalKey: string,
    bytes: Buffer,
    contentHash: string
  ): Promise<SyncProviderWriteResult> {
    return this.objectService.createAsset(
      this.requireWorkspaceId(),
      logicalKey,
      bytes,
      contentHash
    )
  }

  updateAsset(
    logicalKey: string,
    bytes: Buffer,
    contentHash: string,
    expectedVersion: string
  ): Promise<SyncProviderWriteResult> {
    return this.objectService.updateAsset(
      this.requireWorkspaceId(),
      logicalKey,
      bytes,
      contentHash,
      expectedVersion
    )
  }
  private activateWorkspace(workspaceId: string): void {
    if (this.activeWorkspaceId !== workspaceId) {
      this.objectService.clearCache()
      this.enumeratedObjectIds.clear()
    }

    this.activeWorkspaceId = workspaceId
  }
  private requireWorkspaceId(): string {
    if (!this.activeWorkspaceId) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Permanent,
        'A Google Drive workspace must be selected before synchronization.'
      )
    }

    return this.activeWorkspaceId
  }
}
