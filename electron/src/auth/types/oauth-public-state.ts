import type { OAuthAccount } from './oauth-account.js'
import type { OAuthConnectionStatus } from './oauth-connection-status.js'
import type { OAuthDiagnosticCode } from './oauth-diagnostic-code.js'
import type { OAuthProviderEnum } from './oauth-provider-enum.js'

export interface OAuthPublicState {
  account: OAuthAccount | null
  diagnosticCode: OAuthDiagnosticCode | null
  errorCode: string | null
  provider: OAuthProviderEnum | null
  status: OAuthConnectionStatus
}
