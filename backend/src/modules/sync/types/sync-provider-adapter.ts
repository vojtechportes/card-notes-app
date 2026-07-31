import type { SyncEntityKindEnum } from './sync-entity-kind-enum'
import type { SyncProviderChangePage } from './sync-provider-change-page'
import type { SyncProviderEnumerationPage } from './sync-provider-enumeration-page'
import type { SyncProviderIdentity } from './sync-provider-identity'
import type { SyncProviderReadResult } from './sync-provider-read-result'
import type { SyncProviderWorkspace } from './sync-provider-workspace'
import type { SyncProviderWriteResult } from './sync-provider-write-result'

export interface SyncProviderAdapter {
  getIdentity(): Promise<SyncProviderIdentity>
  discoverWorkspace(workspaceId: string): Promise<SyncProviderWorkspace | null>
  createWorkspace(workspaceId: string): Promise<SyncProviderWorkspace>
  enumerateObjects(pageToken?: string): Promise<SyncProviderEnumerationPage>
  listChanges(
    cursor: string,
    pageToken?: string
  ): Promise<SyncProviderChangePage>
  readObject(logicalKey: string): Promise<SyncProviderReadResult>
  createDocument(
    logicalKey: string,
    entityKind: SyncEntityKindEnum,
    canonicalJson: string
  ): Promise<SyncProviderWriteResult>
  updateDocument(
    logicalKey: string,
    entityKind: SyncEntityKindEnum,
    canonicalJson: string,
    expectedVersion: string
  ): Promise<SyncProviderWriteResult>
  createAsset(
    logicalKey: string,
    bytes: Buffer,
    contentHash: string
  ): Promise<SyncProviderWriteResult>
}
