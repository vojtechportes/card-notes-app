export interface SyncConfigurationEntity<TPayload> {
  id: string
  payload: TPayload | null
  mutationId: string
  modifiedBy: string
  modifiedAt: string
  deletedAt: string | null
}
