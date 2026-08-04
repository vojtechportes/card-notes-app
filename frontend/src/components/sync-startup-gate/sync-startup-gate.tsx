import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useState, type PropsWithChildren } from 'react'
import { useTranslation } from 'react-i18next'
import { SYNC_WORK_OFFLINE_SESSION_KEY } from '../../constants/sync-work-offline-session-key'
import { useRunSyncNowMutation } from '../../hooks/sync/use-run-sync-now-mutation'
import { useSyncStatusQuery } from '../../hooks/sync/use-sync-status-query'
import { SyncCacheObserver } from '../sync-cache-observer/sync-cache-observer'

const SOFT_WAIT_MS = 5_000

export const SyncStartupGate = ({ children }: PropsWithChildren) => {
  const { t } = useTranslation()
  const [takingLonger, setTakingLonger] = useState(false)
  const [workOffline, setWorkOffline] = useState(
    () => sessionStorage.getItem(SYNC_WORK_OFFLINE_SESSION_KEY) === 'true'
  )
  const statusQuery = useSyncStatusQuery()
  const runSyncMutation = useRunSyncNowMutation()

  const handleRetry = useCallback(() => {
    setTakingLonger(false)
    void runSyncMutation.mutateAsync().finally(() => statusQuery.refetch())
  }, [runSyncMutation, statusQuery])

  const handleWorkOffline = useCallback(() => {
    sessionStorage.setItem(SYNC_WORK_OFFLINE_SESSION_KEY, 'true')
    setWorkOffline(true)
  }, [])

  useEffect(() => {
    if (!statusQuery.data?.isEnabled || statusQuery.data.isStartupReady) {
      return
    }

    const timer = window.setTimeout(() => setTakingLonger(true), SOFT_WAIT_MS)

    return () => window.clearTimeout(timer)
  }, [statusQuery.data])

  useEffect(() => {
    if (statusQuery.data?.state === 'synced') {
      sessionStorage.removeItem(SYNC_WORK_OFFLINE_SESSION_KEY)
    }
  }, [statusQuery.data?.state])

  const ready =
    workOffline ||
    Boolean(
      statusQuery.data &&
      (!statusQuery.data.isEnabled || statusQuery.data.isStartupReady)
    )

  if (ready) {
    return (
      <>
        <SyncCacheObserver />
        {children}
      </>
    )
  }

  const showRecovery = takingLonger || statusQuery.isError

  return (
    <Box
      alignItems="center"
      display="flex"
      justifyContent="center"
      sx={{ inset: 0, p: 3, position: 'absolute' }}
    >
      <Paper sx={{ maxWidth: 560, p: 4, textAlign: 'center', width: '100%' }}>
        <Stack alignItems="center" role="status" spacing={3} aria-live="polite">
          <Stack spacing={1}>
            <Typography component="h1" variant="h4">
              {t('startup.sync.title')}
            </Typography>
            <Typography color="text.secondary">
              {showRecovery
                ? t('startup.sync.takingLonger')
                : t('startup.sync.description')}
            </Typography>
          </Stack>
          {statusQuery.isError ? (
            <Alert severity="error" sx={{ width: '100%' }}>
              {t('startup.sync.error')}
            </Alert>
          ) : (
            <CircularProgress aria-label={t('startup.sync.title')} />
          )}
          {showRecovery ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button
                disabled={runSyncMutation.isPending}
                onClick={handleRetry}
                variant="contained"
              >
                {t('startup.sync.actions.retry')}
              </Button>
              <Button onClick={handleWorkOffline} variant="outlined">
                {t('startup.sync.actions.workOffline')}
              </Button>
            </Stack>
          ) : null}
        </Stack>
      </Paper>
    </Box>
  )
}
