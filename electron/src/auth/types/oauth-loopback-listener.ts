import type { OAuthCallbackResult } from './oauth-callback-result.js'

export interface OAuthLoopbackListener {
  cancel: () => void
  redirectUri: string
  result: Promise<OAuthCallbackResult>
}
