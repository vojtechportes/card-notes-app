export interface PreparedRelayChannel {
  channelId: string
  verificationToken: string
  webhookUrl: string
  preparationExpiresAt: number
}
