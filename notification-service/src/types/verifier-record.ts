export interface VerifierRecord {
  verifierHash: string
  secretVersion: number
  validUntil: number | null
}
