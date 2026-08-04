import { createHash, createHmac } from 'node:crypto'

export const createRelayChallengeProof = (
  workspaceVerifier: string,
  workspaceRouteId: string,
  challengeId: string,
  challenge: string,
  deviceId: string,
  secretVersion: number
): string => {
  const verifierHash = createHash('sha256')
    .update(workspaceVerifier)
    .digest('base64url')
  const payload = [
    'notestack-relay-challenge-v1',
    workspaceRouteId,
    challengeId,
    challenge,
    deviceId,
    String(secretVersion),
  ].join(':')

  return createHmac('sha256', Buffer.from(verifierHash, 'base64url'))
    .update(payload)
    .digest('base64url')
}
