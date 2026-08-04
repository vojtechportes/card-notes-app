import type { ChannelStatus } from './channel-status'

export interface ChannelRecord {
  channelId: string
  verificationTokenHash: string
  status: ChannelStatus
  resourceId: string | null
  expiresAt: number
  createdAt: number
  lastMessageNumber: string | null
  lastMessageAt: number | null
}
