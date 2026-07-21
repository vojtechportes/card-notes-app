import AddIcon from '@mui/icons-material/Add'
import {
  Alert,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useConfirmation } from '../../../../components/confirmation'
import type { LabelDto } from '../../../../types/api'
import { useCreateLabelMutation } from '../../hooks/use-create-label-mutation'
import { useDeleteLabelMutation } from '../../hooks/use-delete-label-mutation'
import { useLabelsQuery } from '../../hooks/use-labels-query'
import { useNoteTypesQuery } from '../../hooks/use-note-types-query'
import { useUpdateLabelMutation } from '../../hooks/use-update-label-mutation'
import { SettingsSection } from '../settings-section'
import { LabelDialog } from './components/label-dialog'
import { LabelsGrid } from './components/labels-grid'
import type { LabelFormValues } from './types/label-form-values'
import { isLabelNameConflictError } from './utils/is-label-name-conflict-error.util'
import { mapLabelFormValuesToPayload } from './utils/map-label-form-values-to-payload.util'

type LabelDialogState =
  { label?: undefined; mode: 'create' } | { label: LabelDto; mode: 'edit' }

export const NoteLabelsSection = () => {
  const { t } = useTranslation()
  const confirmation = useConfirmation()
  const [dialogState, setDialogState] = useState<LabelDialogState | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const labelsQuery = useLabelsQuery()
  const noteTypesQuery = useNoteTypesQuery()
  const createLabelMutation = useCreateLabelMutation()
  const updateLabelMutation = useUpdateLabelMutation()
  const deleteLabelMutation = useDeleteLabelMutation()

  const labels = labelsQuery.data ?? []
  const noteTypes = noteTypesQuery.data ?? []

  const handleOpenCreateDialog = useCallback(() => {
    setDialogError(null)
    setDialogState({ mode: 'create' })
  }, [])

  const handleOpenEditDialog = useCallback((label: LabelDto) => {
    setDialogError(null)
    setDialogState({ label, mode: 'edit' })
  }, [])

  const handleCloseDialog = useCallback(() => {
    setDialogError(null)
    setDialogState(null)
  }, [])

  const handleDialogSubmit = useCallback(
    async (values: LabelFormValues) => {
      const label = mapLabelFormValuesToPayload(values)

      try {
        if (dialogState?.mode === 'edit') {
          await updateLabelMutation.mutateAsync({
            id: dialogState.label.id,
            label,
          })
        } else {
          await createLabelMutation.mutateAsync(label)
        }

        handleCloseDialog()
      } catch (error) {
        setDialogError(
          t(
            isLabelNameConflictError(error)
              ? 'settings.noteLabels.errors.nameConflict'
              : 'settings.noteLabels.errors.submit'
          )
        )
      }
    },
    [
      createLabelMutation,
      dialogState,
      handleCloseDialog,
      t,
      updateLabelMutation,
    ]
  )

  const handleDeleteLabel = useCallback(
    async (label: LabelDto) => {
      setDeleteError(null)
      const confirmed = await confirmation.confirm({
        cancelLabel: t('settings.noteLabels.actions.cancel'),
        confirmLabel: t('settings.noteLabels.actions.confirmDelete'),
        description: t('settings.noteLabels.delete.description', {
          title: label.title,
        }),
        title: t('settings.noteLabels.delete.title'),
        variant: 'destructive',
      })

      if (!confirmed) {
        return
      }

      try {
        await deleteLabelMutation.mutateAsync(label.id)
      } catch {
        setDeleteError(t('settings.noteLabels.errors.delete'))
      }
    },
    [confirmation, deleteLabelMutation, t]
  )

  return (
    <>
      <SettingsSection>
        <Stack spacing={2}>
          <Stack
            alignItems={{ sm: 'center', xs: 'stretch' }}
            direction={{ sm: 'row', xs: 'column' }}
            justifyContent="space-between"
            spacing={2}
          >
            <Typography color="text.secondary">
              {t('settings.noteLabels.summary', { count: labels.length })}
            </Typography>
            <Button
              disabled={noteTypesQuery.isLoading || noteTypesQuery.isError}
              onClick={handleOpenCreateDialog}
              startIcon={<AddIcon />}
              variant="contained"
            >
              {t('settings.noteLabels.actions.add')}
            </Button>
          </Stack>

          {noteTypesQuery.isError ? (
            <Alert severity="error">
              {t('settings.noteLabels.errors.noteTypes')}
            </Alert>
          ) : null}
          {deleteError ? <Alert severity="error">{deleteError}</Alert> : null}

          {labelsQuery.isLoading || noteTypesQuery.isLoading ? (
            <Stack alignItems="center" direction="row" spacing={1.5}>
              <CircularProgress size={20} />
              <Typography color="text.secondary">
                {t('settings.noteLabels.status.loading')}
              </Typography>
            </Stack>
          ) : labelsQuery.isError ? (
            <Alert severity="error">
              {t('settings.noteLabels.status.error')}
            </Alert>
          ) : labels.length === 0 ? (
            <Alert severity="info">
              {t('settings.noteLabels.status.empty')}
            </Alert>
          ) : (
            <LabelsGrid
              labels={labels}
              noteTypes={noteTypes}
              onDelete={handleDeleteLabel}
              onEdit={handleOpenEditDialog}
            />
          )}
        </Stack>
      </SettingsSection>

      <LabelDialog
        isPending={
          createLabelMutation.isPending || updateLabelMutation.isPending
        }
        label={dialogState?.mode === 'edit' ? dialogState.label : undefined}
        noteTypes={noteTypes}
        onClose={handleCloseDialog}
        onSubmit={handleDialogSubmit}
        open={Boolean(dialogState)}
        submitError={dialogError}
      />
    </>
  )
}
