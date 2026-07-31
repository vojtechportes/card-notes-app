import { createHash } from 'node:crypto'

export const createSha256Hash = (value: string): string =>
  createHash('sha256').update(value).digest('hex')
