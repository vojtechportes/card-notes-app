import {
  googleDriveAppPropertyKeys,
  googleDriveAppPropertyRoles,
} from '../constants/google-drive.constants'
import { escapeGoogleDriveQueryValue } from './escape-google-drive-query-value.util'

export const createGoogleDriveObjectQuery = (
  workspaceId: string,
  logicalKey?: string
): string => {
  const role = googleDriveAppPropertyKeys.role
  const workspace = googleDriveAppPropertyKeys.workspaceId
  const conditions = [
    'trashed = false',
    `appProperties has { key='${role}' and value='${googleDriveAppPropertyRoles.object}' }`,
    `appProperties has { key='${workspace}' and value='${escapeGoogleDriveQueryValue(workspaceId)}' }`,
  ]

  if (logicalKey) {
    const key = googleDriveAppPropertyKeys.logicalKey
    conditions.push(
      `appProperties has { key='${key}' and value='${escapeGoogleDriveQueryValue(logicalKey)}' }`
    )
  }

  return conditions.join(' and ')
}
