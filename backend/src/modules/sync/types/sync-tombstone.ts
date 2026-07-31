import type { SyncEntityKindEnum } from './sync-entity-kind-enum'

export interface SyncTombstone {
  workspaceId: string
  entityKind: SyncEntityKindEnum
  entityId: string
  deletionMutationId: string
  deletionDeviceId: string
  deletedAt: string
}
