import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
} from '@mui/material'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { ColumnDto } from '../../../../../types/api'
import { createFormResolver } from '../../../../../utils/create-form-resolver.util'
import { columnTypeOptions } from '../constants/column-type-options'
import type { ColumnFormValues } from '../types/column-form-values'
import { createColumnFormSchema } from '../utils/create-column-form-schema.util'
import { getColumnFormDefaultValues } from '../utils/get-column-form-default-values.util'

interface ColumnDialogProps {
  columns: ColumnDto[]
  column?: ColumnDto
  onClose: () => void
  onSubmit: (values: ColumnFormValues) => Promise<void>
  open: boolean
}

export const ColumnDialog = ({
  columns,
  column,
  onClose,
  onSubmit,
  open,
}: ColumnDialogProps) => {
  const { t } = useTranslation()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const formId = useId().replace(/:/g, '-')
  const initializedColumnIdRef = useRef<string | null>(null)

  const defaultValues = useMemo(() => {
    return getColumnFormDefaultValues(column)
  }, [column])

  const schema = useMemo(() => {
    return createColumnFormSchema(columns, t, column?.id)
  }, [column?.id, columns, t])

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
  } = useForm<ColumnFormValues>({
    defaultValues,
    mode: 'onBlur',
    resolver: createFormResolver(schema),
  })

  const selectedType = useWatch({
    control,
    name: 'type',
  })

  const isEditing = !!column
  const isDefaultColumn = column?.isDefault ?? false

  useEffect(() => {
    if (!open) {
      initializedColumnIdRef.current = null
      return
    }

    const currentColumnId = column?.id ?? 'create'

    if (initializedColumnIdRef.current === currentColumnId) {
      return
    }

    reset(defaultValues)
    setSubmitError(null)
    initializedColumnIdRef.current = currentColumnId
  }, [column?.id, defaultValues, open, reset])

  const handleDialogClose = useCallback(() => {
    if (isSubmitting) {
      return
    }

    initializedColumnIdRef.current = null
    setSubmitError(null)
    reset(defaultValues)
    onClose()
  }, [defaultValues, isSubmitting, onClose, reset])

  const handleFormSubmit = useCallback(
    async (values: ColumnFormValues) => {
      setSubmitError(null)

      try {
        await onSubmit(values)
        initializedColumnIdRef.current = null
        reset(getColumnFormDefaultValues(column))
        onClose()
      } catch {
        setSubmitError(t('settings.columns.errors.submit'))
      }
    },
    [column, onClose, onSubmit, reset, t]
  )

  return (
    <Dialog
      fullWidth
      maxWidth="sm"
      open={open}
      onClose={(_, reason) => {
        if (reason === 'backdropClick' && isSubmitting) {
          return
        }

        handleDialogClose()
      }}
    >
      <DialogTitle>
        {isEditing
          ? t('settings.columns.dialog.editTitle')
          : t('settings.columns.dialog.createTitle')}
      </DialogTitle>

      <DialogContent dividers>
        {submitError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {submitError}
          </Alert>
        ) : null}

        <form id={formId} noValidate onSubmit={handleSubmit(handleFormSubmit)}>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Controller
              control={control}
              name="title"
              render={({ field }) => (
                <TextField
                  autoFocus
                  error={!!errors.title}
                  fullWidth
                  helperText={errors.title?.message}
                  label={t('settings.columns.fields.title')}
                  onChange={field.onChange}
                  value={field.value}
                />
              )}
            />

            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <TextField
                  disabled={isDefaultColumn}
                  error={!!errors.name}
                  fullWidth
                  helperText={
                    isDefaultColumn
                      ? t('settings.columns.hints.defaultIdentity')
                      : errors.name?.message
                  }
                  label={t('settings.columns.fields.name')}
                  onChange={field.onChange}
                  value={field.value}
                />
              )}
            />

            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <FormControl error={!!errors.type} fullWidth>
                  <InputLabel id={`${formId}-type-label`}>
                    {t('settings.columns.fields.type')}
                  </InputLabel>
                  <Select
                    disabled={isDefaultColumn}
                    label={t('settings.columns.fields.type')}
                    labelId={`${formId}-type-label`}
                    onChange={field.onChange}
                    value={field.value}
                  >
                    {columnTypeOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {t(`settings.columns.types.${option}`)}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    {isDefaultColumn
                      ? t('settings.columns.hints.defaultIdentity')
                      : errors.type?.message}
                  </FormHelperText>
                </FormControl>
              )}
            />

            {selectedType === 'image' ? (
              <Controller
                control={control}
                name="isMultiImage"
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={field.value}
                        onChange={(_, checked) => field.onChange(checked)}
                      />
                    }
                    label={t('settings.columns.fields.multiImage')}
                  />
                )}
              />
            ) : null}

            <Controller
              control={control}
              name="isHidden"
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(_, checked) => field.onChange(checked)}
                    />
                  }
                  label={t('settings.columns.fields.hidden')}
                />
              )}
            />
          </Stack>
        </form>
      </DialogContent>

      <DialogActions>
        <Button disabled={isSubmitting} onClick={handleDialogClose}>
          {t('settings.columns.actions.cancel')}
        </Button>
        <Button
          disabled={isSubmitting}
          form={formId}
          type="submit"
          variant="contained"
        >
          {isSubmitting
            ? t('settings.columns.actions.saving')
            : isEditing
              ? t('settings.columns.actions.save')
              : t('settings.columns.actions.create')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
