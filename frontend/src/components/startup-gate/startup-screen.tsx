import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import appLogo from '../../assets/app-logo.svg'
import type { StartupState } from '../../types/startup-state'
import { StartupRecoveryActions } from './startup-recovery-actions'

interface StartupScreenProps {
  onExit: () => void
  onOpenBackendLog: () => void
  onRetry: () => void
  state: Exclude<StartupState, { status: 'ready' }>
}

export const StartupScreen = ({
  onExit,
  onOpenBackendLog,
  onRetry,
  state,
}: StartupScreenProps) => {
  const { t } = useTranslation()
  const isFailed = state.status === 'failed'
  const isTakingLonger =
    state.status === 'starting' && state.phase === 'taking-longer'
  const title = isFailed
    ? t('startup.failed.title')
    : isTakingLonger
      ? t('startup.takingLonger.title')
      : t('startup.starting.title')
  const description = isFailed
    ? t('startup.failed.reasons.' + state.reason)
    : isTakingLonger
      ? t('startup.takingLonger.description')
      : t('startup.starting.description')

  return (
    <Box
      alignItems="center"
      display="flex"
      justifyContent="center"
      minHeight="100vh"
      p={3}
    >
      <Paper
        elevation={3}
        sx={{
          maxWidth: 560,
          p: { xs: 3, sm: 5 },
          textAlign: 'center',
          width: '100%',
        }}
      >
        <Stack alignItems="center" role="status" spacing={3} aria-live="polite">
          <Box
            alt={t('app.logoAlt')}
            component="img"
            src={appLogo}
            sx={{ height: 72, width: 72 }}
          />
          <Stack spacing={1}>
            <Typography component="h1" variant="h4">
              {t('app.brand')}
            </Typography>
            <Typography component="h2" variant="h5">
              {title}
            </Typography>
            <Typography color="text.secondary">{description}</Typography>
          </Stack>
          {isFailed ? (
            <Alert severity="error" sx={{ textAlign: 'left', width: '100%' }}>
              {t('startup.failed.help')}
            </Alert>
          ) : (
            <CircularProgress aria-label={t('startup.progressLabel')} />
          )}
          {(isTakingLonger || isFailed) && (
            <StartupRecoveryActions
              onExit={onExit}
              onOpenBackendLog={onOpenBackendLog}
              onRetry={onRetry}
            />
          )}
        </Stack>
      </Paper>
    </Box>
  )
}
