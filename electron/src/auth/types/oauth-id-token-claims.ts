export interface OAuthIdTokenClaims {
  aud: string | string[]
  email?: string
  exp: number
  iss: string
  name?: string
  nonce?: string
  oid?: string
  preferred_username?: string
  sub: string
  tid?: string
}
