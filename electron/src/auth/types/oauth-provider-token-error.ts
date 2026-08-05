import type { OAuthInvalidRequestDetail } from './oauth-invalid-request-detail.js'

export interface OAuthProviderTokenError {
  code: string | null
  invalidRequestDetail: OAuthInvalidRequestDetail | null
}
