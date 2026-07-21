import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useId, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { LabelChip } from '../../../../../components/label-chip/label-chip'
import { sharedLabelSourceValue } from '../constants/shared-label-source-value'
import { LabelColorField } from './label-color-field'
import type { LabelDto, NoteTypeDto } from '../../../../../types/api'
import { createFormResolver } from '../../../../../utils/create-form-resolver.util'
import type { LabelFormValues } from '../types/label-form-values'
import { createLabelFormSchema } from '../utils/create-label-form-schema.util'

interface LabelDialogProps {
  isPending: boolean
  label?: LabelDto
  noteTypes: NoteTypeDto[]
  onClose: () => void
  onSubmit: (values: LabelFormValues) => Promise<void>
  open: boolean
  submitError: string | null
}

export const LabelDialog = ({
  isPending,
  label,
  noteTypes,
  onClose,
  onSubmit,
  open,
  submitError,
}: LabelDialogProps) => {
  const { t } = useTranslation()
  const formId = useId().replace(/:/g, '-')

  const schema = useMemo(() => {
    return createLabelFormSchema({
      colorFormat: t('settings.noteLabels.validation.colorFormat'),
      colorRequired: t('settings.noteLabels.validation.colorRequired'),
      nameRequired: t('settings.noteLabels.validation.nameRequired'),
      sourceRequired: t('settings.noteLabels.validation.sourceRequired'),
      titleRequired: t('settings.noteLabels.validation.titleRequired'),
    })
  }, [t])

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    watch,
  } = useForm<LabelFormValues>({
    defaultValues: {
      color: '#0070F2',
      name: '',
      noteTypeId: sharedLabelSourceValue,
      title: '',
    },
    mode: 'onBlur',
    resolver: createFormResolver(schema),
  })

  const previewColor = watch('color')
  const previewTitle = watch('title')

  const handleDialogClose = useCallback(() => {
    if (isPending || isSubmitting) {
      return
    }

    onClose()
  }, [isPending, isSubmitting, onClose])

  useEffect(() => {
    if (!open) {
      return
    }

    reset({
      color: label?.color ?? '#0070F2',
      name: label?.name ?? '',
      noteTypeId: label?.noteTypeId ?? sharedLabelSourceValue,
      title: label?.title ?? '',
    })
  }, [label, open, reset])

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
        {label
          ? t('settings.noteLabels.dialog.editTitle')
          : t('settings.noteLabels.dialog.createTitle')}
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
            helperText={errors.title?.message}
            label={t('settings.noteLabels.fields.title')}
            {...register('title')}
          />
          <TextField
            error={Boolean(errors.name)}
            fullWidth
            helperText={
              errors.name?.message ?? t('settings.noteLabels.fields.nameHint')
            }
            label={t('settings.noteLabels.fields.name')}
            {...register('name')}
          />
          <FormControl fullWidth error={Boolean(errors.noteTypeId)}>
            <InputLabel id={`${formId}-source-label`}>
              {t('settings.noteLabels.fields.source')}
            </InputLabel>
            <Controller
              control={control}
              name="noteTypeId"
              render={({ field }) => (
                <Select
                  {...field}
                  label={t('settings.noteLabels.fields.source')}
                  labelId={`${formId}-source-label`}
                >
                  <MenuItem value={sharedLabelSourceValue}>
                    {t('settings.noteLabels.sources.shared')}
                  </MenuItem>
                  {noteTypes.map((noteType) => (
                    <MenuItem key={noteType.id} value={noteType.id}>
                      {noteType.title}
                    </MenuItem>
                  ))}
                </Select>
              )}
            />
            {errors.noteTypeId ? (
              <FormHelperText>{errors.noteTypeId.message}</FormHelperText>
            ) : null}
          </FormControl>
          <LabelColorField
            control={control}
            helperText={t('settings.noteLabels.fields.colorHint')}
            label={t('settings.noteLabels.fields.color')}
            pickerLabel={t('settings.noteLabels.fields.colorPicker')}
          />
          <Stack spacing={1}>
            <Typography color="text.secondary" variant="body2">
              {t('settings.noteLabels.fields.preview')}
            </Typography>
            <Stack alignItems="flex-start">
              <LabelChip
                color={previewColor}
                title={
                  previewTitle.trim() ||
                  t('settings.noteLabels.fields.previewFallback')
                }
              />
            </Stack>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          disabled={isPending || isSubmitting}
          onClick={handleDialogClose}
        >
          {t('settings.noteLabels.actions.cancel')}
        </Button>
        <Button
          disabled={isPending || isSubmitting}
          form={formId}
          type="submit"
          variant="contained"
        >
          {isPending || isSubmitting ? (
            <CircularProgress color="inherit" size={18} />
          ) : label ? (
            t('settings.noteLabels.actions.save')
          ) : (
            t('settings.noteLabels.actions.create')
          )}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
