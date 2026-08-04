export interface RelayRenewalLease {
  leaseId: string | null
  deviceId: string | null
  expiresAt: number | null
  owned: boolean
  renewalRequired: boolean
  activeChannelExpiresAt: number | null
}
