export interface AuthenticatedDevice {
  deviceId: string
  secretVersion: number
  tokenHash: string
}
