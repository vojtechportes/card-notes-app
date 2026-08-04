export interface PreparedChannel {
  channelId: string
  verificationToken: string
  webhookUrl: string
  preparationExpiresAt: number
}
