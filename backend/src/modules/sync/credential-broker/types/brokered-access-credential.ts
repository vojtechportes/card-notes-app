import type { SyncProviderEnum } from '../../types/sync-provider-enum'

export interface BrokeredAccessCredential {
  accessToken: string
  expiresAt: string
  provider: SyncProviderEnum
}
