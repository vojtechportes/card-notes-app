import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { SyncConflictDto } from '../../../../../types/api'
import { getSyncConflictVersionContent } from '../utils/get-sync-conflict-version-content.util'

interface SyncConflictInspectDialogProps {
  conflict: SyncConflictDto | null
  onClose: () => void
}

export const SyncConflictInspectDialog = ({
  conflict,
  onClose,
}: SyncConflictInspectDialogProps) => {
  const { t } = useTranslation()

  const versions = useMemo(() => {
    if (!conflict) {
      return []
    }

    return [
      {
        label: t('settings.synchronization.conflicts.localVersion'),
        value: getSyncConflictVersionContent(conflict.localDocumentJson),
      },
      {
        label: t('settings.synchronization.conflicts.cloudVersion'),
        value: getSyncConflictVersionContent(conflict.remoteDocumentJson),
      },
    ]
  }, [conflict, t])

  return (
    <Dialog fullWidth maxWidth="md" onClose={onClose} open={Boolean(conflict)}>
      <DialogTitle>
        <Stack
          alignItems="center"
          direction="row"
          justifyContent="space-between"
        >
          {t('settings.synchronization.conflicts.inspectTitle')}
          <IconButton
            aria-label={t('settings.synchronization.conflicts.closeInspect')}
            onClick={onClose}
          >
            <CloseOutlinedIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography color="text.secondary">
            {t('settings.synchronization.conflicts.inspectDescription')}
          </Typography>
          {versions.map((version) => (
            <Stack key={version.label} spacing={1}>
              <Typography component="h4" fontWeight={700}>
                {version.label}
              </Typography>
              <Paper
                component="pre"
                variant="outlined"
                sx={{
                  m: 0,
                  maxHeight: 320,
                  overflow: 'auto',
                  p: 2,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {version.value ??
                  t('settings.synchronization.conflicts.versionUnavailable')}
              </Paper>
            </Stack>
          ))}
        </Stack>
      </DialogContent>
    </Dialog>
  )
}
