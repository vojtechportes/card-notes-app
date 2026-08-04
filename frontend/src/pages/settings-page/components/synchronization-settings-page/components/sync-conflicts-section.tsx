import { Alert, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useSyncConflictsQuery } from '../../../../../hooks/sync/use-sync-conflicts-query'
import { SyncConflictItem } from './sync-conflict-item'

export const SyncConflictsSection = () => {
  const { t } = useTranslation()
  const conflictsQuery = useSyncConflictsQuery()

  if (conflictsQuery.isLoading) {
    return (
      <Typography>{t('settings.synchronization.conflicts.loading')}</Typography>
    )
  }

  if (conflictsQuery.isError) {
    return (
      <Alert severity="error">
        {t('settings.synchronization.conflicts.error')}
      </Alert>
    )
  }

  if (!conflictsQuery.data?.length) {
    return null
  }

  return (
    <Stack spacing={1.5}>
      <Typography component="h3" variant="h6">
        {t('settings.synchronization.conflicts.title')}
      </Typography>
      <Typography color="text.secondary">
        {t('settings.synchronization.conflicts.description')}
      </Typography>
      {conflictsQuery.data.map((conflict) => (
        <SyncConflictItem key={conflict.id} conflict={conflict} />
      ))}
    </Stack>
  )
}
