import type { JsonWebKey } from 'node:crypto'

export interface OAuthJsonWebKey extends JsonWebKey {
  alg?: string
  kid: string
  kty: string
  use?: string
}
