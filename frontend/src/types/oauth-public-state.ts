import type { OAuthAccount } from './oauth-account'
import type { OAuthConnectionStatus } from './oauth-connection-status'
import type { OAuthDiagnosticCode } from './oauth-diagnostic-code'
import type { OAuthProviderEnum } from './oauth-provider-enum'

export interface OAuthPublicState {
  account: OAuthAccount | null
  diagnosticCode: OAuthDiagnosticCode | null
  errorCode: string | null
  provider: OAuthProviderEnum | null
  status: OAuthConnectionStatus
}
