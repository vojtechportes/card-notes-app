import { WORKSPACE_ROUTE_ID_PATTERN } from '../constants/workspace-route-id-pattern'
import { SYNC_FORMAT_VERSION } from '../constants/sync-format-version'
import type { WorkspaceDocument } from '../types/workspace-document'
import { isIsoDate } from './is-iso-date.util'
import { isNotificationAuthKeyValid } from './is-notification-auth-key-valid.util'
import { isRecord } from './is-record.util'
import { isUuidV4 } from './is-uuid-v4.util'

export const isWorkspaceDocumentValid = (
  value: unknown
): value is WorkspaceDocument => {
  if (!isRecord(value) || !isRecord(value.notificationRouting)) {
    return false
  }

  const routing = value.notificationRouting

  return (
    value.formatVersion === SYNC_FORMAT_VERSION &&
    isUuidV4(value.workspaceId) &&
    isIsoDate(value.createdAt) &&
    isUuidV4(value.createdByDeviceId) &&
    typeof routing.workspaceRouteId === 'string' &&
    WORKSPACE_ROUTE_ID_PATTERN.test(routing.workspaceRouteId) &&
    isNotificationAuthKeyValid(routing.notificationAuthKey) &&
    Number.isInteger(routing.secretVersion) &&
    Number(routing.secretVersion) > 0
  )
}
