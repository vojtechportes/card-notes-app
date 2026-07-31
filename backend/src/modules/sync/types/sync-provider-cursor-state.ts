import type { SyncProviderEnum } from './sync-provider-enum'

export interface SyncProviderCursorState {
  workspaceId: string
  provider: SyncProviderEnum
  cursor: string | null
  cursorGeneration: number
  isInvalidated: boolean
  invalidationReason: string | null
}
