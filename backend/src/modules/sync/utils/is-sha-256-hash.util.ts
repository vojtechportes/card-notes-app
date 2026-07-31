import { SHA_256_HEX_LENGTH } from '../constants/sha-256-hex-length'

export const isSha256Hash = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length === SHA_256_HEX_LENGTH &&
  /^[0-9a-f]+$/.test(value)
