import { createHash } from 'node:crypto'

export const createPkceChallenge = (verifier: string): string => {
  return createHash('sha256').update(verifier).digest('base64url')
}
