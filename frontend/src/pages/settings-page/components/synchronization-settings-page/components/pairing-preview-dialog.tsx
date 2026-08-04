import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { SyncPairingOperationDto } from '../../../../../types/api'
import { getPairingDecisions } from '../utils/get-pairing-decisions.util'

interface PairingPreviewDialogProps {
  busy: boolean
  onCancel: () => void
  onConfirm: (
    decision: NonNullable<SyncPairingOperationDto['decision']>
  ) => void
  operation: SyncPairingOperationDto | null
}

export const PairingPreviewDialog = ({
  busy,
  onCancel,
  onConfirm,
  operation,
}: PairingPreviewDialogProps) => {
  const { t } = useTranslation()

  return (
    <Dialog
      open={Boolean(operation)}
      onClose={busy ? undefined : onCancel}
      fullWidth
    >
      <DialogTitle>{t('settings.synchronization.pairing.title')}</DialogTitle>
      <DialogContent dividers>
        {operation ? (
          <Stack spacing={2}>
            <Typography>
              {t(`settings.synchronization.pairing.modes.${operation.mode}`)}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {t('settings.synchronization.pairing.summary', {
                local: operation.localIsPopulated
                  ? t('settings.synchronization.pairing.populated')
                  : t('settings.synchronization.pairing.empty'),
                remote: operation.remoteIsPopulated
                  ? t('settings.synchronization.pairing.populated')
                  : t('settings.synchronization.pairing.empty'),
              })}
            </Typography>
            {operation.pendingMutationCount > 0 ? (
              <Typography color="warning.main">
                {t('settings.synchronization.pairing.pending', {
                  count: operation.pendingMutationCount,
                })}
              </Typography>
            ) : null}
            <Stack spacing={1}>
              {getPairingDecisions(operation.mode).map((decision) => (
                <Button
                  key={decision}
                  disabled={busy}
                  onClick={() => onConfirm(decision)}
                  variant={
                    decision === 'replace-local' ? 'outlined' : 'contained'
                  }
                  color={decision.startsWith('replace') ? 'warning' : 'primary'}
                >
                  {t(`settings.synchronization.pairing.decisions.${decision}`)}
                </Button>
              ))}
            </Stack>
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={onCancel}>
          {t('settings.synchronization.actions.cancel')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
