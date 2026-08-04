export interface ConnectionTokenRecord {
  tokenHash: string
  deviceId: string
  secretVersion: number
  expiresAt: number
  connectedAt: number | null
}
