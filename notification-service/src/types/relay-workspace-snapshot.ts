import type { ChallengeRecord } from './challenge-record'
import type { ChannelRecord } from './channel-record'
import type { ConnectionTokenRecord } from './connection-token-record'
import type { RateLimitWindow } from './rate-limit-window'
import type { RenewalLeaseRecord } from './renewal-lease-record'
import type { VerifierRecord } from './verifier-record'

export interface RelayWorkspaceSnapshot {
  protocolVersion: number
  registeredAt: number | null
  currentVerifier: VerifierRecord | null
  previousVerifier: VerifierRecord | null
  challenges: Record<string, ChallengeRecord>
  connectionTokens: Record<string, ConnectionTokenRecord>
  channels: Record<string, ChannelRecord>
  renewalLease: RenewalLeaseRecord | null
  rateLimits: Record<string, RateLimitWindow>
  pendingNotificationAt: number | null
  lastNotificationAt: number | null
}
