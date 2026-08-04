export interface ChallengeRecord {
  id: string
  nonce: string
  expiresAt: number
  usedAt: number | null
}
