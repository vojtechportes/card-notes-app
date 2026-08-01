import type { SyncEntityKindEnum } from './sync-entity-kind-enum'

export interface SyncProviderObjectMetadata {
  logicalKey: string
  providerObjectId: string
  providerVersion: string
  entityKind: SyncEntityKindEnum
  contentHash: string | null
  size: number
  isDeleted: boolean
}
