import { createHmac } from 'node:crypto'

export const deriveWorkspaceVerifier = (
  notificationAuthKey: string,
  workspaceRouteId: string
): string =>
  createHmac('sha256', Buffer.from(notificationAuthKey, 'base64url'))
    .update(`notestack-relay-verifier-v1\u0000${workspaceRouteId}`)
    .digest('base64url')
