import type { SyncProviderEnum } from './sync-provider-enum'

export interface SyncAccountState {
  workspaceId: string
  isEnabled: boolean
  activeProvider: SyncProviderEnum | null
  connectionState: string
  providerAccountId: string | null
  providerAccountDisplayName: string | null
  providerWorkspaceId: string | null
  providerWorkspaceDisplayName: string | null
  lastAttemptedAt: string | null
  lastSucceededAt: string | null
  lastErrorClassification: string | null
}
