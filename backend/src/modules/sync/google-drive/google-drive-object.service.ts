import {
  googleDriveAppPropertyKeys,
  googleDriveAppPropertyRoles,
} from './constants/google-drive.constants'
import { GoogleDriveFileService } from './google-drive-file.service'
import type { GoogleDriveFile } from './types/google-drive-file'
import type { GoogleDriveVersionedFile } from './types/google-drive-versioned-file'
import { SyncEntityKindEnum } from '../types/sync-entity-kind-enum'
import type { SyncProviderObjectMappingReader } from '../types/sync-provider-object-mapping-reader'
import type { SyncProviderObjectMetadata } from '../types/sync-provider-object-metadata'
import type { SyncProviderReadResult } from '../types/sync-provider-read-result'
import { SyncProviderEnum } from '../types/sync-provider-enum'
import { SyncProviderError } from '../types/sync-provider-error'
import { SyncProviderErrorKindEnum } from '../types/sync-provider-error-kind-enum'
import type { SyncProviderWriteResult } from '../types/sync-provider-write-result'
import { compareGoogleDriveFileId } from './utils/compare-google-drive-file-id.util'
import { createGoogleDriveObjectMetadata } from './utils/create-google-drive-object-metadata.util'
import { createGoogleDriveObjectQuery } from './utils/create-google-drive-object-query.util'
import { createSha256Hash } from './utils/create-sha-256-hash.util'
import { getDocumentContentHash } from './utils/get-document-content-hash.util'
import { mapGoogleDriveFileMetadata } from './utils/map-google-drive-file-metadata.util'

export class GoogleDriveObjectService {
  private readonly metadataByLogicalKey = new Map<
    string,
    SyncProviderObjectMetadata
  >()
  private readonly metadataByProviderObjectId = new Map<
    string,
    SyncProviderObjectMetadata
  >()

  constructor(
    private readonly fileService: GoogleDriveFileService,
    private readonly mappingReader: SyncProviderObjectMappingReader,
    private readonly resumableThreshold: number
  ) {}

  clearCache(): void {
    this.metadataByLogicalKey.clear()
    this.metadataByProviderObjectId.clear()
  }

  async hydrateFile(
    file: GoogleDriveFile,
    workspaceId: string
  ): Promise<SyncProviderObjectMetadata | null> {
    if (!file.id) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Permanent,
        'Google Drive returned a file without an ID.'
      )
    }

    const versioned = await this.fileService.getFile(file.id)
    if (!this.isFileInWorkspace(versioned.file, workspaceId)) {
      return null
    }

    const metadata = mapGoogleDriveFileMetadata(
      versioned.file,
      versioned.providerVersion
    )
    if (metadata) {
      this.cacheMetadata(metadata)
    }

    return metadata
  }

  async resolveCanonicalObject(
    workspaceId: string,
    logicalKey: string
  ): Promise<SyncProviderObjectMetadata | null> {
    return this.findObject(workspaceId, logicalKey, true)
  }

  async getDeletedMetadata(
    workspaceId: string,
    providerObjectId: string,
    file?: GoogleDriveFile
  ): Promise<SyncProviderObjectMetadata | null> {
    const known =
      this.metadataByProviderObjectId.get(providerObjectId) ??
      this.mappingReader.findProviderObjectMetadata(
        SyncProviderEnum.GoogleDrive,
        workspaceId,
        providerObjectId
      )

    if (known) {
      const replacement = await this.findObject(
        workspaceId,
        known.logicalKey,
        true
      )
      if (replacement) {
        return replacement
      }

      const deleted = { ...known, isDeleted: true }
      this.cacheMetadata(deleted)
      return deleted
    }

    if (!file || !this.isFileInWorkspace(file, workspaceId)) {
      return null
    }

    const metadata = mapGoogleDriveFileMetadata(
      file,
      file.version ? `version:${file.version}` : 'deleted'
    )
    if (!metadata) {
      return null
    }

    const replacement = await this.findObject(
      workspaceId,
      metadata.logicalKey,
      true
    )
    if (replacement) {
      return replacement.providerObjectId === providerObjectId
        ? { ...metadata, isDeleted: true }
        : replacement
    }

    const deleted = { ...metadata, isDeleted: true }
    this.cacheMetadata(deleted)
    return deleted
  }

  async readObject(
    workspaceId: string,
    logicalKey: string
  ): Promise<SyncProviderReadResult> {
    const metadata = await this.requireObject(workspaceId, logicalKey)
    const current = await this.fileService.getFile(metadata.providerObjectId)
    const content = await this.fileService.downloadFile(
      metadata.providerObjectId,
      current.providerVersion
    )

    return {
      bytes: content.bytes,
      providerObjectId: metadata.providerObjectId,
      providerVersion: current.providerVersion,
      contentType: content.contentType,
    }
  }

  async createDocument(
    workspaceId: string,
    logicalKey: string,
    entityKind: SyncEntityKindEnum,
    canonicalJson: string
  ): Promise<SyncProviderWriteResult> {
    if (await this.findObject(workspaceId, logicalKey)) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.PreconditionFailed,
        `Google Drive object already exists: ${logicalKey}`
      )
    }

    const versioned = await this.fileService.createMultipartFile(
      createGoogleDriveObjectMetadata(
        workspaceId,
        logicalKey,
        entityKind,
        getDocumentContentHash(canonicalJson)
      ),
      Buffer.from(canonicalJson, 'utf8'),
      'application/json'
    )
    const result = this.acceptWrite(versioned)

    return this.requireCanonicalWrite(workspaceId, logicalKey, result)
  }

  async updateDocument(
    workspaceId: string,
    logicalKey: string,
    entityKind: SyncEntityKindEnum,
    canonicalJson: string,
    expectedVersion: string
  ): Promise<SyncProviderWriteResult> {
    const current = await this.requireObject(workspaceId, logicalKey)
    if (current.providerVersion !== expectedVersion) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.PreconditionFailed,
        `Google Drive object version changed: ${logicalKey}`
      )
    }

    const versioned = await this.fileService.updateMultipartFile(
      current.providerObjectId,
      expectedVersion,
      createGoogleDriveObjectMetadata(
        workspaceId,
        logicalKey,
        entityKind,
        getDocumentContentHash(canonicalJson)
      ),
      Buffer.from(canonicalJson, 'utf8'),
      'application/json'
    )

    return this.acceptWrite(versioned)
  }

  async createAsset(
    workspaceId: string,
    logicalKey: string,
    bytes: Buffer,
    contentHash: string
  ): Promise<SyncProviderWriteResult> {
    if (createSha256Hash(bytes) !== contentHash) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Permanent,
        'Asset content hash does not match its bytes.'
      )
    }

    const existing = await this.findObject(workspaceId, logicalKey)
    if (existing) {
      if (existing.contentHash !== contentHash) {
        throw new SyncProviderError(
          SyncProviderErrorKindEnum.PreconditionFailed,
          'Immutable Google Drive asset contains different bytes.'
        )
      }

      return {
        providerObjectId: existing.providerObjectId,
        providerVersion: existing.providerVersion,
      }
    }

    const metadata = createGoogleDriveObjectMetadata(
      workspaceId,
      logicalKey,
      SyncEntityKindEnum.Asset,
      contentHash
    )
    let versioned: GoogleDriveVersionedFile
    if (bytes.length >= this.resumableThreshold) {
      versioned = await this.fileService.createResumableFile(
        metadata,
        bytes,
        'application/octet-stream'
      )
    } else {
      versioned = await this.fileService.createMultipartFile(
        metadata,
        bytes,
        'application/octet-stream'
      )
    }

    const result = this.acceptWrite(versioned)
    const completed = await this.fileService.downloadFile(
      result.providerObjectId,
      result.providerVersion
    )
    if (
      completed.bytes.length !== bytes.length ||
      createSha256Hash(completed.bytes) !== contentHash
    ) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Permanent,
        'Google Drive asset verification failed after upload.'
      )
    }

    return this.requireCanonicalWrite(workspaceId, logicalKey, result)
  }

  async updateAsset(
    workspaceId: string,
    logicalKey: string,
    bytes: Buffer,
    contentHash: string,
    expectedVersion: string
  ): Promise<SyncProviderWriteResult> {
    if (createSha256Hash(bytes) !== contentHash) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Permanent,
        'Asset content hash does not match its bytes.'
      )
    }

    const current = await this.requireObject(workspaceId, logicalKey)
    if (current.providerVersion !== expectedVersion) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.PreconditionFailed,
        `Google Drive asset version changed: ${logicalKey}`
      )
    }

    const versioned = await this.fileService.updateMultipartFile(
      current.providerObjectId,
      expectedVersion,
      createGoogleDriveObjectMetadata(
        workspaceId,
        logicalKey,
        SyncEntityKindEnum.Asset,
        contentHash
      ),
      bytes,
      'application/octet-stream'
    )
    const result = this.acceptWrite(versioned)
    const completed = await this.fileService.downloadFile(
      result.providerObjectId,
      result.providerVersion
    )
    if (
      completed.bytes.length !== bytes.length ||
      createSha256Hash(completed.bytes) !== contentHash
    ) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Permanent,
        'Google Drive asset verification failed after repair.'
      )
    }

    return result
  }
  private async findObject(
    workspaceId: string,
    logicalKey: string,
    forceRefresh = false
  ): Promise<SyncProviderObjectMetadata | null> {
    const cached = this.metadataByLogicalKey.get(logicalKey)
    if (!forceRefresh && cached && !cached.isDeleted) {
      const refreshed = await this.fileService.getFile(cached.providerObjectId)
      if (this.isFileInWorkspace(refreshed.file, workspaceId)) {
        const metadata = mapGoogleDriveFileMetadata(
          refreshed.file,
          refreshed.providerVersion
        )
        if (metadata && !metadata.isDeleted) {
          this.cacheMetadata(metadata)
          return metadata
        }
      }
    }

    const query = createGoogleDriveObjectQuery(workspaceId, logicalKey)
    const matches: GoogleDriveFile[] = []
    let pageToken: string | undefined

    do {
      const page = await this.fileService.listFiles(query, pageToken)
      matches.push(...(page.files ?? []).filter((file) => !file.trashed))
      pageToken = page.nextPageToken
    } while (pageToken)

    const canonical = matches.sort(compareGoogleDriveFileId)[0]
    if (!canonical) {
      return null
    }

    return this.hydrateFile(canonical, workspaceId)
  }

  private async requireObject(
    workspaceId: string,
    logicalKey: string
  ): Promise<SyncProviderObjectMetadata> {
    const metadata = await this.findObject(workspaceId, logicalKey)
    if (!metadata) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.NotFound,
        `Google Drive object not found: ${logicalKey}`
      )
    }

    return metadata
  }

  private async requireCanonicalWrite(
    workspaceId: string,
    logicalKey: string,
    result: SyncProviderWriteResult
  ): Promise<SyncProviderWriteResult> {
    const canonical = await this.findObject(workspaceId, logicalKey, true)
    if (!canonical || canonical.providerObjectId !== result.providerObjectId) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.PreconditionFailed,
        `A concurrent Google Drive create won: ${logicalKey}`
      )
    }

    return {
      providerObjectId: canonical.providerObjectId,
      providerVersion: canonical.providerVersion,
    }
  }

  private acceptWrite(
    versioned: GoogleDriveVersionedFile
  ): SyncProviderWriteResult {
    const metadata = mapGoogleDriveFileMetadata(
      versioned.file,
      versioned.providerVersion
    )
    if (!metadata) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Permanent,
        'Google Drive returned an unclassified file after a write.'
      )
    }

    this.cacheMetadata(metadata)
    return {
      providerObjectId: metadata.providerObjectId,
      providerVersion: metadata.providerVersion,
    }
  }

  private isFileInWorkspace(
    file: GoogleDriveFile,
    workspaceId: string
  ): boolean {
    const properties = file.appProperties
    if (
      properties?.[googleDriveAppPropertyKeys.role] !==
      googleDriveAppPropertyRoles.object
    ) {
      return false
    }

    const fileWorkspaceId = properties[googleDriveAppPropertyKeys.workspaceId]
    if (!fileWorkspaceId) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Permanent,
        'Google Drive returned NoteStack metadata without a workspace ID.'
      )
    }

    return fileWorkspaceId === workspaceId
  }

  private cacheMetadata(metadata: SyncProviderObjectMetadata): void {
    this.metadataByLogicalKey.set(metadata.logicalKey, metadata)
    this.metadataByProviderObjectId.set(metadata.providerObjectId, metadata)
  }
}
