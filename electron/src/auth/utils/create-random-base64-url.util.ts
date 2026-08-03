import { randomBytes } from 'node:crypto'

export const createRandomBase64Url = (byteLength = 32): string => {
  return randomBytes(byteLength).toString('base64url')
}
