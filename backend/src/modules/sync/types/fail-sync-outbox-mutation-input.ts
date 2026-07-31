export interface FailSyncOutboxMutationInput {
  mutationId: string
  claimToken: string
  failureClassification: string
  nextAttemptAt: string
  failedAt?: string
}
