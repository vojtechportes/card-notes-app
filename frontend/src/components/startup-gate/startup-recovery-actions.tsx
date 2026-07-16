import { Button, Stack } from '@mui/material'
import { useTranslation } from 'react-i18next'

interface StartupRecoveryActionsProps {
  onExit: () => void
  onOpenBackendLog: () => void
  onRetry: () => void
}

export const StartupRecoveryActions = ({
  onExit,
  onOpenBackendLog,
  onRetry,
}: StartupRecoveryActionsProps) => {
  const { t } = useTranslation()

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="center"
      spacing={1}
    >
      <Button onClick={onRetry} variant="contained">
        {t('startup.actions.retry')}
      </Button>
      <Button onClick={onOpenBackendLog} variant="outlined">
        {t('startup.actions.openBackendLog')}
      </Button>
      <Button color="inherit" onClick={onExit}>
        {t('startup.actions.exit')}
      </Button>
    </Stack>
  )
}
