import { createHash } from 'node:crypto'

export const createOneDriveContentHash = (bytes: Buffer): string =>
  createHash('sha256').update(bytes).digest('hex')
