import { Badge, IconButton, Tooltip } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { SYNC_WORK_OFFLINE_SESSION_KEY } from '../../constants/sync-work-offline-session-key'
import { useRunSyncNowMutation } from '../../hooks/sync/use-run-sync-now-mutation'
import { useSyncStatusQuery } from '../../hooks/sync/use-sync-status-query'
import { getSyncStatusIcon } from './utils/get-sync-status-icon.util'

export const SyncAppBarControl = () => {
  const { t } = useTranslation()
  const statusQuery = useSyncStatusQuery()
  const runSyncMutation = useRunSyncNowMutation()
  const status = statusQuery.data

  if (!status?.isEnabled) {
    return null
  }

  const workOffline =
    sessionStorage.getItem(SYNC_WORK_OFFLINE_SESSION_KEY) === 'true'
  const displayState =
    workOffline && status.state !== 'synced' ? 'offline' : status.state
  const label = t('syncAppBar.label', {
    state: t(`syncAppBar.states.${displayState}`),
  })
  const disabled = status.state === 'syncing' || runSyncMutation.isPending
  const StatusIcon = getSyncStatusIcon(displayState)
  let tooltip = label

  if (status.pendingMutationCount > 0) {
    tooltip = `${label}: ${t('syncAppBar.pending', {
      count: status.pendingMutationCount,
    })}`
  }

  return (
    <Tooltip title={tooltip}>
      <span>
        <IconButton
          aria-label={`${label}. ${t('syncAppBar.syncNow')}`}
          color="inherit"
          disabled={disabled}
          onClick={() => runSyncMutation.mutate()}
        >
          <Badge badgeContent={status.pendingMutationCount} color="warning">
            <StatusIcon />
          </Badge>
        </IconButton>
      </span>
    </Tooltip>
  )
}
