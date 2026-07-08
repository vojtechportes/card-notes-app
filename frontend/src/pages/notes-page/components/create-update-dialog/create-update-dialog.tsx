import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { NoteDto } from '../../../../types/api';
import { createFormResolver } from '../../../../utils/create-form-resolver.util';
import { useNoteColumnsQuery } from '../../hooks/use-note-columns-query';
import {
  useCreateNoteMutation,
  useUpdateNoteMutation,
} from '../../hooks/use-notes-query';
import { NoteFormFields } from './components/note-form-fields';
import type { FormValues } from './types/form-values';
import { createNoteFormSchema } from './utils/create-note-form-schema.util';
import { filterEditableNoteColumns } from './utils/filter-editable-note-columns.util';
import { getNoteFormDefaultValues } from './utils/get-note-form-default-values.util';
import { mapFormValuesToCreateNoteDto } from './utils/map-form-values-to-create-note-dto.util';
import { mapFormValuesToUpdateNoteDto } from './utils/map-form-values-to-update-note.util';

export type CreateUpdateDialogMode = 'create' | 'update';

interface CreateUpdateDialogProps {
  mode: CreateUpdateDialogMode;
  note?: NoteDto;
  open: boolean;
  onClose: () => void;
}

export const CreateUpdateDialog = ({
  mode,
  note,
  open,
  onClose,
}: CreateUpdateDialogProps) => {
  const { t } = useTranslation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const formId = useId().replace(/:/g, '-');
  const initializationKeyRef = useRef<string | null>(null);
  const noteColumnsQuery = useNoteColumnsQuery();
  const createNoteMutation = useCreateNoteMutation();
  const updateNoteMutation = useUpdateNoteMutation();

  const editableColumns = useMemo(() => {
    return filterEditableNoteColumns(noteColumnsQuery.data ?? []);
  }, [noteColumnsQuery.data]);

  const defaultValues = useMemo(() => {
    return getNoteFormDefaultValues(editableColumns, note);
  }, [editableColumns, note]);

  const schema = useMemo(() => {
    return createNoteFormSchema(editableColumns, t);
  }, [editableColumns, t]);

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
  });

  const isSubmitting =
    isFormSubmitting || createNoteMutation.isPending || updateNoteMutation.isPending;
  const hasColumnsError = noteColumnsQuery.isError;
  const hasMissingNote = mode === 'update' && !note;
  const initializationKey = `${mode}:${note?.id ?? 'create'}`;
  const titleKey = mode === 'create' ? 'notes.createDialog.title' : 'notes.updateDialog.title';
  const submitLabelKey =
    mode === 'create'
      ? 'notes.createUpdateDialog.actions.create'
      : 'notes.createUpdateDialog.actions.update';

  useEffect(() => {
    if (!open) {
      initializationKeyRef.current = null;
      return;
    }

    if (initializationKeyRef.current === initializationKey) {
      return;
    }

    reset(defaultValues);
    setSubmitError(null);
    initializationKeyRef.current = initializationKey;
  }, [defaultValues, initializationKey, open, reset]);

  const handleDialogClose = useCallback(() => {
    if (isSubmitting) {
      return;
    }

    initializationKeyRef.current = null;
    reset(defaultValues);
    setSubmitError(null);
    onClose();
  }, [onClose, reset, defaultValues, isSubmitting]);

  const handleFormSubmit = async (values: FormValues) => {
    if (mode === 'update' && !note) {
      setSubmitError(t('notes.createUpdateDialog.errors.missingNote'));
      return;
    }

    setSubmitError(null);

    try {
      if (mode === 'create') {
        await createNoteMutation.mutateAsync(
          mapFormValuesToCreateNoteDto(editableColumns, values),
        );
      } else if (note) {
        await updateNoteMutation.mutateAsync({
          id: note.id,
          note: mapFormValuesToUpdateNoteDto(editableColumns, values),
        });
      }

      initializationKeyRef.current = null;
      reset(getNoteFormDefaultValues(editableColumns, mode === 'create' ? undefined : note));
      onClose();
    } catch {
      setSubmitError(t('notes.createUpdateDialog.errors.submit'));
    }
  };

  return (
    <Dialog
      fullWidth
      maxWidth="md"
      open={open}
      onClose={(_, reason) => {
        if (reason === 'backdropClick' && isSubmitting) {
          return;
        }

        handleDialogClose();
      }}
    >
      <DialogTitle>{t(titleKey)}</DialogTitle>

      <DialogContent dividers>
        {submitError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {submitError}
          </Alert>
        )}

        {noteColumnsQuery.isLoading ? (
          <Typography color="text.secondary">
            {t('notes.createUpdateDialog.status.loadingColumns')}
          </Typography>
        ) : hasColumnsError ? (
          <Alert severity="error">
            {t('notes.createUpdateDialog.status.columnsError')}
          </Alert>
        ) : hasMissingNote ? (
          <Alert severity="error">
            {t('notes.createUpdateDialog.errors.missingNote')}
          </Alert>
        ) : (
          <form id={formId} noValidate onSubmit={handleSubmit(handleFormSubmit)}>
            {editableColumns.length === 0 ? (
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
          </form>
        )}
      </DialogContent>

      <DialogActions>
        <Button disabled={isSubmitting} onClick={handleDialogClose}>
          {t('notes.createUpdateDialog.actions.cancel')}
        </Button>
        <Button
          disabled={isSubmitting || noteColumnsQuery.isLoading || hasColumnsError || hasMissingNote}
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
  );
};
