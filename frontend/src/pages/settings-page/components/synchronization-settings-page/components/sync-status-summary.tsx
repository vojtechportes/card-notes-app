import { Chip, Divider, Stack, Typography } from '@mui/material'
import { formatDistanceToNow } from 'date-fns'
import { useTranslation } from 'react-i18next'
import type { SyncStatusDto } from '../../../../../types/api'

interface SyncStatusSummaryProps {
  status: SyncStatusDto
}

export const SyncStatusSummary = ({ status }: SyncStatusSummaryProps) => {
  const { t } = useTranslation()
  const lastSucceeded = status.lastSucceededAt
    ? formatDistanceToNow(new Date(status.lastSucceededAt), { addSuffix: true })
    : t('settings.synchronization.status.never')

  return (
    <Stack spacing={2}>
      <Stack alignItems="center" direction="row" spacing={1}>
        <Typography component="h3" variant="h6">
          {t('settings.synchronization.status.title')}
        </Typography>
        <Chip
          label={t(`settings.synchronization.states.${status.state}`)}
          color={status.state === 'synced' ? 'success' : 'default'}
          size="small"
        />
      </Stack>
      <Divider />
      <Stack spacing={0.75}>
        <Typography>
          {t('settings.synchronization.status.provider', {
            value: status.provider
              ? t(`settings.synchronization.providers.${status.provider}`)
              : t('settings.synchronization.status.none'),
          })}
        </Typography>
        <Typography>
          {t('settings.synchronization.status.account', {
            value:
              status.accountDisplayName ??
              status.accountId ??
              t('settings.synchronization.status.none'),
          })}
        </Typography>
        <Typography>
          {t('settings.synchronization.status.workspace', {
            value:
              status.workspaceDisplayName ??
              status.workspaceId ??
              t('settings.synchronization.status.none'),
          })}
        </Typography>
        <Typography>
          {t('settings.synchronization.status.lastSuccess', {
            value: lastSucceeded,
          })}
        </Typography>
        <Typography>
          {t('settings.synchronization.status.pending', {
            count: status.pendingMutationCount,
          })}
        </Typography>
        <Typography>
          {t('settings.synchronization.status.conflicts', {
            count: status.unresolvedConflictCount,
          })}
        </Typography>
      </Stack>
      {status.lastErrorClassification ? (
        <Typography color="error.main">
          {t(
            `settings.synchronization.errors.${status.lastErrorClassification}`
          )}
        </Typography>
      ) : null}
    </Stack>
  )
}
