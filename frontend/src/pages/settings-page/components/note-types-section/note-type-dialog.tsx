import {
  Alert,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Stack,
  TextField,
} from '@mui/material'
import { useCallback, useEffect, useId, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { NoteTypeDto } from '../../../../types/api'
import { createFormResolver } from '../../../../utils/create-form-resolver.util'
import { createNoteTypeFormSchema } from './utils/create-note-type-form-schema.util'

interface NoteTypeFormValues {
  title: string
}

interface NoteTypeDialogProps {
  noteType?: NoteTypeDto
  onClose: () => void
  onSubmit: (values: NoteTypeFormValues) => Promise<void>
  open: boolean
  submitError: string | null
  isPending: boolean
}

export const NoteTypeDialog = ({
  noteType,
  onClose,
  onSubmit,
  open,
  submitError,
  isPending,
}: NoteTypeDialogProps) => {
  const { t } = useTranslation()
  const formId = useId().replace(/:/g, '-')

  const schema = useMemo(() => {
    return createNoteTypeFormSchema(t('settings.noteTypes.validation.titleRequired'))
  }, [t])

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<NoteTypeFormValues>({
    defaultValues: {
      title: noteType?.title ?? '',
    },
    mode: 'onBlur',
    resolver: createFormResolver(schema),
  })

  useEffect(() => {
    if (!open) {
      return
    }

    reset({
      title: noteType?.title ?? '',
    })
  }, [noteType?.title, open, reset])

  const handleDialogClose = useCallback(() => {
    if (isPending || isSubmitting) {
      return
    }

    onClose()
  }, [isPending, isSubmitting, onClose])

  return (
    <Dialog
      fullWidth
      maxWidth="sm"
      open={open}
      onClose={(_, reason) => {
        if (reason === 'backdropClick' && (isPending || isSubmitting)) {
          return
        }

        handleDialogClose()
      }}
    >
      <DialogTitle>
        {noteType
          ? t('settings.noteTypes.dialog.editTitle')
          : t('settings.noteTypes.dialog.createTitle')}
      </DialogTitle>
      <DialogContent dividers>
        <Stack
          component="form"
          id={formId}
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          spacing={2}
        >
          {submitError ? <Alert severity="error">{submitError}</Alert> : null}

          <TextField
            autoFocus
            error={Boolean(errors.title)}
            fullWidth
            helperText={
              errors.title?.message ?? t('settings.noteTypes.fields.titleHint')
            }
            label={t('settings.noteTypes.fields.title')}
            {...register('title')}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={isPending || isSubmitting} onClick={handleDialogClose}>
          {t('settings.noteTypes.actions.cancel')}
        </Button>
        <Button form={formId} type="submit" variant="contained">
          {isPending || isSubmitting ? (
            <CircularProgress color="inherit" size={18} />
          ) : noteType ? (
            t('settings.noteTypes.actions.save')
          ) : (
            t('settings.noteTypes.actions.create')
          )}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
