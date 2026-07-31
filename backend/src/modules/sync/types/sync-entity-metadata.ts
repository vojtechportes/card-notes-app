export interface SyncEntityMetadata {
  mutationId: string
  modifiedByDeviceId: string
  modifiedAt: string
  deletedAt: string | null
  deletionMutationId: string | null
  deletionDeviceId: string | null
}
