import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import { Alert, Button, Stack, Typography } from '@mui/material'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useConfirmation } from '../../../../components/confirmation'
import { useDeleteAllNotesMutation } from '../../hooks/use-delete-all-notes-mutation'
import { SettingsSection } from '../settings-section'

interface FeedbackState {
  message: string
  severity: 'error' | 'success'
}

export const DangerZoneSection = () => {
  const { t } = useTranslation()
  const confirmation = useConfirmation()
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const deleteAllNotesMutation = useDeleteAllNotesMutation()

  const handleDeleteAllNotes = useCallback(async () => {
    setFeedback(null)

    const isConfirmed = await confirmation.confirm({
      title: t('settings.dangerZone.confirmDelete.title'),
      description: t('settings.dangerZone.confirmDelete.description'),
      confirmLabel: t('settings.dangerZone.confirmDelete.actions.confirm'),
      variant: 'destructive',
    })

    if (!isConfirmed) {
      return
    }

    try {
      const result = await deleteAllNotesMutation.mutateAsync()

      setFeedback({
        message: t('settings.dangerZone.status.deleted', {
          count: result.deletedCount,
        }),
        severity: 'success',
      })
    } catch {
      setFeedback({
        message: t('settings.dangerZone.errors.delete'),
        severity: 'error',
      })
    }
  }, [confirmation, deleteAllNotesMutation, t])

  return (
    <SettingsSection
      description={t('settings.dangerZone.summary')}
      title={t('settings.sections.dangerZone.title')}
    >
      <Stack spacing={2}>
        <Alert severity="warning">{t('settings.dangerZone.warning')}</Alert>
        {feedback ? (
          <Alert severity={feedback.severity}>{feedback.message}</Alert>
        ) : null}

        <Stack
          alignItems={{ sm: 'center', xs: 'stretch' }}
          direction={{ sm: 'row', xs: 'column' }}
          justifyContent="space-between"
          spacing={2}
        >
          <Typography color="text.secondary" variant="body2">
            {t('settings.dangerZone.hint')}
          </Typography>
          <Button
            color="error"
            disabled={deleteAllNotesMutation.isPending}
            onClick={() => {
              void handleDeleteAllNotes()
            }}
            startIcon={<DeleteSweepIcon />}
            variant="contained"
          >
            {deleteAllNotesMutation.isPending
              ? t('settings.dangerZone.actions.deleting')
              : t('settings.dangerZone.actions.delete')}
          </Button>
        </Stack>
      </Stack>
    </SettingsSection>
  )
}
