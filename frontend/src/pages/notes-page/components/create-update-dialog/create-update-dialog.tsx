import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { NoteDto } from '../../../../types/api'
import { createFormResolver } from '../../../../utils/create-form-resolver.util'
import { useNoteTypesQuery } from '../../../settings-page/hooks/use-note-types-query'
import { useNoteColumnsQuery } from '../../hooks/use-note-columns-query'
import {
  useCreateNoteMutation,
  useUpdateNoteMutation,
} from '../../hooks/use-notes-query'
import { NoteFormFields } from './components/note-form-fields'
import { NoteTypeSelectField } from './components/note-type-select-field'
import type { FormValues } from './types/form-values'
import { createNoteFormSchema } from './utils/create-note-form-schema.util'
import { filterEditableNoteColumns } from './utils/filter-editable-note-columns.util'
import { getNoteFormDefaultValues } from './utils/get-note-form-default-values.util'
import { mapFormValuesToCreateNoteDto } from './utils/map-form-values-to-create-note-dto.util'
import { mapFormValuesToUpdateNoteDto } from './utils/map-form-values-to-update-note.util'

export type CreateUpdateDialogMode = 'create' | 'update'

interface CreateUpdateDialogProps {
  mode: CreateUpdateDialogMode
  note?: NoteDto
  open: boolean
  onClose: () => void
}

export const CreateUpdateDialog = ({
  mode,
  note,
  open,
  onClose,
}: CreateUpdateDialogProps) => {
  const { t } = useTranslation()
  const [selectedCreateNoteTypeId, setSelectedCreateNoteTypeId] = useState<
    string | undefined
  >()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const formId = useId().replace(/:/g, '-')
  const initializationKeyRef = useRef<string | null>(null)
  const noteTypesQuery = useNoteTypesQuery()
  const activeNoteTypeId =
    mode === 'update' ? note?.noteTypeId : selectedCreateNoteTypeId
  const noteColumnsQuery = useNoteColumnsQuery(activeNoteTypeId)
  const createNoteMutation = useCreateNoteMutation()
  const updateNoteMutation = useUpdateNoteMutation()

  const editableColumns = useMemo(() => {
    return filterEditableNoteColumns(noteColumnsQuery.data ?? [])
  }, [noteColumnsQuery.data])

  const defaultValues = useMemo(() => {
    return getNoteFormDefaultValues(editableColumns, note)
  }, [editableColumns, note])

  const schema = useMemo(() => {
    return createNoteFormSchema(editableColumns, t)
  }, [editableColumns, t])

  const {
    clearErrors,
    control,
    formState: { isSubmitting: isFormSubmitting },
    handleSubmit,
    reset,
    setError,
  } = useForm<FormValues>({
    defaultValues,
    mode: 'onBlur',
    resolver: createFormResolver(schema),
  })

  const isSubmitting =
    isFormSubmitting ||
    createNoteMutation.isPending ||
    updateNoteMutation.isPending
  const hasColumnsError = noteColumnsQuery.isError
  const hasMissingNote = mode === 'update' && !note
  const hasMissingNoteType = mode === 'create' && !activeNoteTypeId
  const hasNoteTypesError = mode === 'create' && noteTypesQuery.isError
  const isNoteTypesLoading = mode === 'create' && noteTypesQuery.isLoading
  const initializationKey = `${mode}:${note?.id ?? 'create'}:${activeNoteTypeId ?? 'none'}`
  const titleKey =
    mode === 'create' ? 'notes.createDialog.title' : 'notes.updateDialog.title'
  const submitLabelKey =
    mode === 'create'
      ? 'notes.createUpdateDialog.actions.create'
      : 'notes.createUpdateDialog.actions.update'

  useEffect(() => {
    if (!open) {
      initializationKeyRef.current = null
      return
    }

    if (initializationKeyRef.current === initializationKey) {
      return
    }

    reset(defaultValues)
    setSubmitError(null)
    initializationKeyRef.current = initializationKey
  }, [defaultValues, initializationKey, open, reset])

  const handleDialogClose = useCallback(() => {
    if (isSubmitting) {
      return
    }

    initializationKeyRef.current = null
    setSelectedCreateNoteTypeId(undefined)
    reset(defaultValues)
    setSubmitError(null)
    onClose()
  }, [defaultValues, isSubmitting, onClose, reset])

  const handleFormSubmit = useCallback(
    async (values: FormValues) => {
      if (mode === 'update' && !note) {
        setSubmitError(t('notes.createUpdateDialog.errors.missingNote'))
        return
      }

      if (mode === 'create' && !activeNoteTypeId) {
        return
      }

      setSubmitError(null)

      try {
        if (mode === 'create' && activeNoteTypeId) {
          await createNoteMutation.mutateAsync(
            mapFormValuesToCreateNoteDto(
              editableColumns,
              values,
              activeNoteTypeId
            )
          )
        } else if (note) {
          await updateNoteMutation.mutateAsync({
            id: note.id,
            note: mapFormValuesToUpdateNoteDto(editableColumns, values),
          })
        }

        initializationKeyRef.current = null
        setSelectedCreateNoteTypeId(undefined)
        reset(
          getNoteFormDefaultValues(
            editableColumns,
            mode === 'create' ? undefined : note
          )
        )
        onClose()
      } catch {
        setSubmitError(t('notes.createUpdateDialog.errors.submit'))
      }
    },
    [
      activeNoteTypeId,
      createNoteMutation,
      editableColumns,
      mode,
      note,
      onClose,
      reset,
      t,
      updateNoteMutation,
    ]
  )

  return (
    <Dialog
      fullWidth
      maxWidth="md"
      open={open}
      onClose={(_, reason) => {
        if (reason === 'backdropClick' && isSubmitting) {
          return
        }

        handleDialogClose()
      }}
    >
      <DialogTitle>{t(titleKey)}</DialogTitle>

      <DialogContent dividers>
        {submitError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {submitError}
          </Alert>
        )}

        {hasMissingNote ? (
          <Alert severity="error">
            {t('notes.createUpdateDialog.errors.missingNote')}
          </Alert>
        ) : (
          <form
            id={formId}
            noValidate
            onSubmit={handleSubmit(handleFormSubmit)}
          >
            <Stack spacing={2}>
              <NoteTypeSelectField
                disabled={
                  isSubmitting || mode === 'update' || noteTypesQuery.isLoading
                }
                mode={mode}
                noteTypes={noteTypesQuery.data ?? []}
                selectedNoteTypeId={activeNoteTypeId}
                onNoteTypeChange={(noteTypeId) => {
                  setSelectedCreateNoteTypeId(noteTypeId || undefined)
                }}
              />

              {isNoteTypesLoading ? (
                <Typography color="text.secondary">
                  {t('notes.createUpdateDialog.status.loadingNoteTypes')}
                </Typography>
              ) : hasNoteTypesError ? (
                <Alert severity="error">
                  {t('notes.createUpdateDialog.status.noteTypesError')}
                </Alert>
              ) : hasMissingNoteType ? (
                <Typography color="text.secondary">
                  {t('notes.createUpdateDialog.status.selectNoteType')}
                </Typography>
              ) : noteColumnsQuery.isLoading ? (
                <Typography color="text.secondary">
                  {t('notes.createUpdateDialog.status.loadingColumns')}
                </Typography>
              ) : hasColumnsError ? (
                <Alert severity="error">
                  {t('notes.createUpdateDialog.status.columnsError')}
                </Alert>
              ) : editableColumns.length === 0 ? (
                <Typography color="text.secondary">
                  {t('notes.createUpdateDialog.emptyEditableColumns')}
                </Typography>
              ) : (
                <NoteFormFields
                  clearErrors={clearErrors}
                  columns={editableColumns}
                  control={control}
                  setError={setError}
                />
              )}
            </Stack>
          </form>
        )}
      </DialogContent>

      <DialogActions>
        <Button disabled={isSubmitting} onClick={handleDialogClose}>
          {t('notes.createUpdateDialog.actions.cancel')}
        </Button>
        <Button
          disabled={
            isSubmitting ||
            isNoteTypesLoading ||
            hasNoteTypesError ||
            noteColumnsQuery.isLoading ||
            hasColumnsError ||
            hasMissingNote ||
            hasMissingNoteType
          }
          form={formId}
          type="submit"
          variant="contained"
        >
          {isSubmitting
            ? t('notes.createUpdateDialog.actions.saving')
            : t(submitLabelKey)}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
