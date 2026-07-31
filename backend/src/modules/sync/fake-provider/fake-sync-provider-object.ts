import type { SyncEntityKindEnum } from '../types/sync-entity-kind-enum'

export interface FakeSyncProviderObject {
  logicalKey: string
  providerObjectId: string
  providerVersion: string
  entityKind: SyncEntityKindEnum
  bytes: Buffer
  contentHash: string | null
  contentType: string
  isDeleted: boolean
  sequence: number
}
