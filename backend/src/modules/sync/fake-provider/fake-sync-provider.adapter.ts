import { createHash } from 'node:crypto'
import { v4 as uuidV4 } from 'uuid'
import type { FakeSyncProviderObject } from './fake-sync-provider-object'
import type { FakeSyncProviderOperation } from './fake-sync-provider-operation'
import type { FakeSyncProviderOptions } from './fake-sync-provider-options'
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

export class FakeSyncProviderAdapter implements SyncProviderAdapter {
  private readonly objects = new Map<string, FakeSyncProviderObject>()
  private readonly failures: Partial<
    Record<FakeSyncProviderOperation, SyncProviderError[]>
  >
  private readonly pageSize: number
  private workspace: SyncProviderWorkspace | null = null
  private sequence = 0
  private minimumValidCursor = 0

  constructor(options: FakeSyncProviderOptions = {}) {
    this.pageSize = options.pageSize ?? 100
    this.failures = options.failures ?? {}
  }

  async getIdentity(): Promise<SyncProviderIdentity> {
    return {
      providerName: 'fake',
      accountId: 'fake-account',
      accountDisplayName: 'Fake account',
      adapterVersion: '1',
    }
  }

  async discoverWorkspace(
    workspaceId: string
  ): Promise<SyncProviderWorkspace | null> {
    if (this.workspace?.providerWorkspaceId !== workspaceId) {
      return null
    }

    return { ...this.workspace }
  }

  async createWorkspace(workspaceId: string): Promise<SyncProviderWorkspace> {
    if (this.workspace && this.workspace.providerWorkspaceId !== workspaceId) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.PreconditionFailed,
        'A different fake workspace already exists.'
      )
    }

    this.workspace ??= {
      providerWorkspaceId: workspaceId,
      displayName: 'Fake workspace',
    }
    return { ...this.workspace }
  }

  async enumerateObjects(
    pageToken?: string
  ): Promise<SyncProviderEnumerationPage> {
    this.throwQueuedFailure('enumerate')
    const objects = [...this.objects.values()]
      .filter((object) => !object.isDeleted)
      .sort((left, right) => left.logicalKey.localeCompare(right.logicalKey))
    const page = this.createPage(objects, pageToken)

    return {
      objects: page.items.map((object) => this.toMetadata(object)),
      nextPageToken: page.nextPageToken,
      candidateCursor: String(this.sequence),
    }
  }

  async listChanges(
    cursor: string,
    pageToken?: string
  ): Promise<SyncProviderChangePage> {
    this.throwQueuedFailure('list-changes')
    const parsedCursor = Number(cursor)

    if (
      !Number.isInteger(parsedCursor) ||
      parsedCursor < this.minimumValidCursor ||
      parsedCursor > this.sequence
    ) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.InvalidCursor,
        'The fake provider cursor is invalid.'
      )
    }

    const changes = [...this.objects.values()]
      .filter((object) => object.sequence > parsedCursor)
      .sort((left, right) => left.sequence - right.sequence)
    const page = this.createPage(changes, pageToken)

    return {
      changes: page.items.map((object) => this.toMetadata(object)),
      nextPageToken: page.nextPageToken,
      candidateCursor: String(this.sequence),
    }
  }

  async readObject(logicalKey: string): Promise<SyncProviderReadResult> {
    this.throwQueuedFailure('read')
    const object = this.objects.get(logicalKey)

    if (!object || object.isDeleted) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.NotFound,
        `Fake provider object not found: ${logicalKey}`
      )
    }

    return {
      bytes: Buffer.from(object.bytes),
      providerObjectId: object.providerObjectId,
      providerVersion: object.providerVersion,
      contentType: object.contentType,
    }
  }

  async createDocument(
    logicalKey: string,
    entityKind: SyncEntityKindEnum,
    canonicalJson: string
  ): Promise<SyncProviderWriteResult> {
    this.throwQueuedFailure('create-document')
    const existing = this.objects.get(logicalKey)

    if (existing && !existing.isDeleted) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.PreconditionFailed,
        `Fake provider object already exists: ${logicalKey}`
      )
    }

    return this.writeObject(
      logicalKey,
      entityKind,
      Buffer.from(canonicalJson, 'utf8'),
      'application/json',
      this.getDocumentHash(canonicalJson),
      existing?.providerObjectId
    )
  }

  async updateDocument(
    logicalKey: string,
    entityKind: SyncEntityKindEnum,
    canonicalJson: string,
    expectedVersion: string
  ): Promise<SyncProviderWriteResult> {
    this.throwQueuedFailure('update-document')
    const existing = this.objects.get(logicalKey)

    if (
      !existing ||
      existing.isDeleted ||
      existing.providerVersion !== expectedVersion
    ) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.PreconditionFailed,
        `Fake provider version precondition failed: ${logicalKey}`
      )
    }

    return this.writeObject(
      logicalKey,
      entityKind,
      Buffer.from(canonicalJson, 'utf8'),
      'application/json',
      this.getDocumentHash(canonicalJson),
      existing.providerObjectId
    )
  }

  async createAsset(
    logicalKey: string,
    bytes: Buffer,
    contentHash: string
  ): Promise<SyncProviderWriteResult> {
    this.throwQueuedFailure('create-asset')
    const actualHash = createHash('sha256').update(bytes).digest('hex')

    if (actualHash !== contentHash) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Permanent,
        'Asset content hash does not match its bytes.'
      )
    }

    const existing = this.objects.get(logicalKey)
    if (existing && !existing.isDeleted) {
      if (existing.contentHash !== contentHash) {
        throw new SyncProviderError(
          SyncProviderErrorKindEnum.PreconditionFailed,
          'Immutable asset key contains different bytes.'
        )
      }

      return {
        providerObjectId: existing.providerObjectId,
        providerVersion: existing.providerVersion,
      }
    }

    return this.writeObject(
      logicalKey,
      SyncEntityKindEnum.Asset,
      bytes,
      'application/octet-stream',
      contentHash,
      existing?.providerObjectId
    )
  }

  seedDocument(
    logicalKey: string,
    entityKind: SyncEntityKindEnum,
    canonicalJson: string
  ): SyncProviderWriteResult {
    return this.writeObject(
      logicalKey,
      entityKind,
      Buffer.from(canonicalJson, 'utf8'),
      'application/json',
      this.getDocumentHash(canonicalJson)
    )
  }

  deleteObject(logicalKey: string): void {
    const existing = this.objects.get(logicalKey)
    if (!existing) {
      return
    }

    this.sequence += 1
    this.objects.set(logicalKey, {
      ...existing,
      isDeleted: true,
      providerVersion: String(Number(existing.providerVersion) + 1),
      sequence: this.sequence,
    })
  }

  invalidateCursorsBefore(cursor: number): void {
    this.minimumValidCursor = cursor
  }

  queueFailure(
    operation: FakeSyncProviderOperation,
    error: SyncProviderError
  ): void {
    const failures = this.failures[operation] ?? []
    failures.push(error)
    this.failures[operation] = failures
  }

  getObject(logicalKey: string): FakeSyncProviderObject | undefined {
    const object = this.objects.get(logicalKey)
    return object ? { ...object, bytes: Buffer.from(object.bytes) } : undefined
  }

  private writeObject(
    logicalKey: string,
    entityKind: SyncEntityKindEnum,
    bytes: Buffer,
    contentType: string,
    contentHash: string | null,
    providerObjectId = uuidV4()
  ): SyncProviderWriteResult {
    const currentVersion = Number(
      this.objects.get(logicalKey)?.providerVersion ?? '0'
    )
    this.sequence += 1
    const object: FakeSyncProviderObject = {
      logicalKey,
      providerObjectId,
      providerVersion: String(currentVersion + 1),
      entityKind,
      bytes: Buffer.from(bytes),
      contentHash,
      contentType,
      isDeleted: false,
      sequence: this.sequence,
    }
    this.objects.set(logicalKey, object)

    return {
      providerObjectId: object.providerObjectId,
      providerVersion: object.providerVersion,
    }
  }

  private createPage(
    objects: FakeSyncProviderObject[],
    pageToken?: string
  ): { items: FakeSyncProviderObject[]; nextPageToken: string | null } {
    const offset = pageToken ? Number(pageToken) : 0
    if (!Number.isInteger(offset) || offset < 0) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Permanent,
        'Fake provider page token is invalid.'
      )
    }

    const items = objects.slice(offset, offset + this.pageSize)
    const nextOffset = offset + items.length
    return {
      items,
      nextPageToken: nextOffset < objects.length ? String(nextOffset) : null,
    }
  }

  private toMetadata(
    object: FakeSyncProviderObject
  ): SyncProviderObjectMetadata {
    return {
      logicalKey: object.logicalKey,
      providerObjectId: object.providerObjectId,
      providerVersion: object.providerVersion,
      entityKind: object.entityKind,
      contentHash: object.contentHash,
      size: object.bytes.length,
      isDeleted: object.isDeleted,
    }
  }

  private getDocumentHash(canonicalJson: string): string | null {
    const value = JSON.parse(canonicalJson) as { contentHash?: unknown }
    return typeof value.contentHash === 'string'
      ? value.contentHash
      : createHash('sha256').update(canonicalJson).digest('hex')
  }

  private throwQueuedFailure(operation: FakeSyncProviderOperation): void {
    const error = this.failures[operation]?.shift()
    if (error) {
      throw error
    }
  }
}
