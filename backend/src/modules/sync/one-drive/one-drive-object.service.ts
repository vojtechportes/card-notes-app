import { ONE_DRIVE_OBJECT_FILE_PREFIX } from './constants/one-drive.constants'
import { OneDriveFileService } from './one-drive-file.service'
import type { OneDriveItem } from './types/one-drive-item'
import type { OneDriveVersionedItem } from './types/one-drive-versioned-item'
import { SyncEntityKindEnum } from '../types/sync-entity-kind-enum'
import type { SyncProviderObjectMappingReader } from '../types/sync-provider-object-mapping-reader'
import type { SyncProviderObjectMetadata } from '../types/sync-provider-object-metadata'
import type { SyncProviderReadResult } from '../types/sync-provider-read-result'
import { SyncProviderEnum } from '../types/sync-provider-enum'
import { SyncProviderError } from '../types/sync-provider-error'
import { SyncProviderErrorKindEnum } from '../types/sync-provider-error-kind-enum'
import type { SyncProviderWriteResult } from '../types/sync-provider-write-result'
import { compareOneDriveItemId } from './utils/compare-one-drive-item-id.util'
import { createOneDriveContentHash } from './utils/create-one-drive-content-hash.util'
import { decodeOneDriveLogicalKey } from './utils/decode-one-drive-logical-key.util'
import { encodeOneDriveLogicalKey } from './utils/encode-one-drive-logical-key.util'
import { getOneDriveAssetHash } from './utils/get-one-drive-asset-hash.util'
import { getOneDriveDocumentContentHash } from './utils/get-one-drive-document-content-hash.util'
import { getOneDriveEntityKind } from './utils/get-one-drive-entity-kind.util'

export class OneDriveObjectService {
  private readonly metadataByLogicalKey = new Map<
    string,
    SyncProviderObjectMetadata
  >()
  private readonly metadataByProviderObjectId = new Map<
    string,
    SyncProviderObjectMetadata
  >()

  constructor(
    private readonly fileService: OneDriveFileService,
    private readonly mappingReader: SyncProviderObjectMappingReader,
    private readonly resumableThreshold: number
  ) {}

  clearCache(): void {
    this.metadataByLogicalKey.clear()
    this.metadataByProviderObjectId.clear()
  }

  async hydrateItem(
    item: OneDriveItem,
    rootId: string
  ): Promise<SyncProviderObjectMetadata | null> {
    if (item.deleted) {
      return null
    }
    if (item.parentReference?.id !== rootId || !item.name) {
      return null
    }

    const logicalKey = decodeOneDriveLogicalKey(item.name)
    if (!logicalKey) {
      return null
    }

    const entityKind = getOneDriveEntityKind(logicalKey)
    if (!entityKind) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Permanent,
        'OneDrive returned an unsupported NoteStack logical key.'
      )
    }

    const versioned = await this.requireVersionedItem(item.id)
    const size = versioned.item.size ?? 0
    if (!Number.isSafeInteger(size) || size < 0) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Permanent,
        'OneDrive returned corrupt NoteStack object metadata.'
      )
    }

    const contentHash = await this.getContentHash(
      versioned,
      logicalKey,
      entityKind
    )
    const metadata: SyncProviderObjectMetadata = {
      logicalKey,
      providerObjectId: versioned.item.id!,
      providerVersion: versioned.providerVersion,
      entityKind,
      contentHash,
      size,
      isDeleted: false,
    }
    this.cacheMetadata(metadata)

    return metadata
  }

  async resolveCanonicalObject(
    rootId: string,
    logicalKey: string
  ): Promise<SyncProviderObjectMetadata | null> {
    return this.findObject(rootId, logicalKey, true)
  }

  async getDeletedMetadata(
    workspaceId: string,
    rootId: string,
    item: OneDriveItem
  ): Promise<SyncProviderObjectMetadata | null> {
    if (!item.id) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Permanent,
        'OneDrive returned a deletion without an item ID.'
      )
    }

    const known =
      this.metadataByProviderObjectId.get(item.id) ??
      this.mappingReader.findProviderObjectMetadata(
        SyncProviderEnum.OneDrive,
        workspaceId,
        item.id
      )
    const logicalKey =
      known?.logicalKey ??
      (item.name ? decodeOneDriveLogicalKey(item.name) : null)
    if (!logicalKey) {
      return null
    }

    const replacement = await this.findObject(rootId, logicalKey, true)
    if (replacement) {
      return replacement
    }
    if (!known) {
      return null
    }

    const deleted = { ...known, isDeleted: true }
    this.cacheMetadata(deleted)

    return deleted
  }

  async readObject(
    rootId: string,
    logicalKey: string
  ): Promise<SyncProviderReadResult> {
    const metadata = await this.requireObject(rootId, logicalKey)
    const current = await this.fileService.getItem(metadata.providerObjectId)
    const content = await this.fileService.downloadItem(
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
    rootId: string,
    logicalKey: string,
    entityKind: SyncEntityKindEnum,
    canonicalJson: string
  ): Promise<SyncProviderWriteResult> {
    this.assertLogicalKeyKind(logicalKey, entityKind)
    if (await this.findObject(rootId, logicalKey)) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.PreconditionFailed,
        `OneDrive object already exists: ${logicalKey}`
      )
    }

    const versioned = await this.fileService.createFile(
      rootId,
      this.createFileName(logicalKey),
      Buffer.from(canonicalJson, 'utf8'),
      'application/json'
    )
    const result = await this.acceptWrite(versioned, logicalKey, entityKind)

    return this.requireCanonicalWrite(rootId, logicalKey, result)
  }

  async updateDocument(
    rootId: string,
    logicalKey: string,
    entityKind: SyncEntityKindEnum,
    canonicalJson: string,
    expectedVersion: string
  ): Promise<SyncProviderWriteResult> {
    this.assertLogicalKeyKind(logicalKey, entityKind)
    const current = await this.requireObject(rootId, logicalKey)
    if (current.providerVersion !== expectedVersion) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.PreconditionFailed,
        `OneDrive object version changed: ${logicalKey}`
      )
    }

    const versioned = await this.fileService.updateFile(
      current.providerObjectId,
      Buffer.from(canonicalJson, 'utf8'),
      'application/json',
      expectedVersion
    )

    return this.acceptWrite(versioned, logicalKey, entityKind)
  }

  async createAsset(
    rootId: string,
    logicalKey: string,
    bytes: Buffer,
    contentHash: string
  ): Promise<SyncProviderWriteResult> {
    if (createOneDriveContentHash(bytes) !== contentHash) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Permanent,
        'Asset content hash does not match its bytes.'
      )
    }

    const existing = await this.findObject(rootId, logicalKey)
    if (existing) {
      if (existing.contentHash !== contentHash) {
        throw new SyncProviderError(
          SyncProviderErrorKindEnum.PreconditionFailed,
          'Immutable OneDrive asset contains different bytes.'
        )
      }

      return {
        providerObjectId: existing.providerObjectId,
        providerVersion: existing.providerVersion,
      }
    }

    const name = this.createFileName(logicalKey)
    const versioned =
      bytes.length >= this.resumableThreshold
        ? await this.fileService.createResumableFile(rootId, name, bytes)
        : await this.fileService.createFile(
            rootId,
            name,
            bytes,
            'application/octet-stream'
          )
    const result = await this.acceptWrite(
      versioned,
      logicalKey,
      SyncEntityKindEnum.Asset
    )
    const completed = await this.fileService.downloadItem(
      result.providerObjectId,
      result.providerVersion
    )
    if (
      completed.bytes.length !== bytes.length ||
      createOneDriveContentHash(completed.bytes) !== contentHash
    ) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Permanent,
        'OneDrive asset verification failed after upload.'
      )
    }

    return this.requireCanonicalWrite(rootId, logicalKey, result)
  }

  private async findObject(
    rootId: string,
    logicalKey: string,
    forceRefresh = false
  ): Promise<SyncProviderObjectMetadata | null> {
    const cached = this.metadataByLogicalKey.get(logicalKey)
    if (!forceRefresh && cached && !cached.isDeleted) {
      try {
        const refreshed = await this.fileService.getItem(
          cached.providerObjectId
        )
        return this.hydrateItem(refreshed.item, rootId)
      } catch (error) {
        if (
          !(error instanceof SyncProviderError) ||
          error.kind !== SyncProviderErrorKindEnum.NotFound
        ) {
          throw error
        }
      }
    }

    const expectedName = this.createFileName(logicalKey)
    const matches: OneDriveItem[] = []
    let nextLink: string | undefined

    do {
      const page = await this.fileService.listChildren(rootId, nextLink)
      matches.push(
        ...(page.value ?? []).filter(
          (item) => !item.deleted && item.name === expectedName
        )
      )
      nextLink = page['@odata.nextLink']
    } while (nextLink)

    const canonical = matches.sort(compareOneDriveItemId)[0]

    return canonical ? this.hydrateItem(canonical, rootId) : null
  }

  private async requireObject(
    rootId: string,
    logicalKey: string
  ): Promise<SyncProviderObjectMetadata> {
    const metadata = await this.findObject(rootId, logicalKey)
    if (!metadata) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.NotFound,
        `OneDrive object not found: ${logicalKey}`
      )
    }

    return metadata
  }

  private async requireCanonicalWrite(
    rootId: string,
    logicalKey: string,
    result: SyncProviderWriteResult
  ): Promise<SyncProviderWriteResult> {
    const canonical = await this.findObject(rootId, logicalKey, true)
    if (!canonical || canonical.providerObjectId !== result.providerObjectId) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.PreconditionFailed,
        `A concurrent OneDrive create won: ${logicalKey}`
      )
    }

    return {
      providerObjectId: canonical.providerObjectId,
      providerVersion: canonical.providerVersion,
    }
  }

  private async acceptWrite(
    versioned: OneDriveVersionedItem,
    logicalKey: string,
    entityKind: SyncEntityKindEnum
  ): Promise<SyncProviderWriteResult> {
    const metadata = await this.hydrateItem(
      versioned.item,
      versioned.item.parentReference?.id ?? ''
    )
    if (
      !metadata ||
      metadata.logicalKey !== logicalKey ||
      metadata.entityKind !== entityKind
    ) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Permanent,
        'OneDrive returned an unclassified item after a write.'
      )
    }

    return {
      providerObjectId: metadata.providerObjectId,
      providerVersion: metadata.providerVersion,
    }
  }

  private async getContentHash(
    versioned: OneDriveVersionedItem,
    logicalKey: string,
    entityKind: SyncEntityKindEnum
  ): Promise<string | null> {
    if (entityKind === SyncEntityKindEnum.Asset) {
      return getOneDriveAssetHash(logicalKey)
    }

    const content = await this.fileService.downloadItem(
      versioned.item.id!,
      versioned.providerVersion
    )

    return getOneDriveDocumentContentHash(content.bytes)
  }

  private createFileName(logicalKey: string): string {
    return `${ONE_DRIVE_OBJECT_FILE_PREFIX}${encodeOneDriveLogicalKey(logicalKey)}`
  }

  private assertLogicalKeyKind(
    logicalKey: string,
    entityKind: SyncEntityKindEnum
  ): void {
    if (getOneDriveEntityKind(logicalKey) !== entityKind) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Permanent,
        'OneDrive logical key does not match its entity kind.'
      )
    }
  }

  private async requireVersionedItem(
    itemId: string | undefined
  ): Promise<OneDriveVersionedItem> {
    if (!itemId) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Permanent,
        'OneDrive returned an item without an ID.'
      )
    }

    return this.fileService.getItem(itemId)
  }

  private cacheMetadata(metadata: SyncProviderObjectMetadata): void {
    this.metadataByLogicalKey.set(metadata.logicalKey, metadata)
    this.metadataByProviderObjectId.set(metadata.providerObjectId, metadata)
  }
}
