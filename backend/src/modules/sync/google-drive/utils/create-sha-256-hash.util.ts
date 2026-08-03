import { createHash } from 'node:crypto'

export const createSha256Hash = (bytes: Buffer): string =>
  createHash('sha256').update(bytes).digest('hex')
