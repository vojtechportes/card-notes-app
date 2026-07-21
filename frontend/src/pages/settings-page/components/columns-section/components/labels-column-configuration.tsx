import {
  Alert,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  ListItemText,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Typography,
} from '@mui/material'
import type { Control, FieldErrors } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNoteTypesQuery } from '../../../hooks/use-note-types-query'
import { sharedLabelSourceValue } from '../constants/shared-label-source-value'
import type { ColumnFormValues } from '../types/column-form-values'

interface LabelsColumnConfigurationProps {
  control: Control<ColumnFormValues>
  errors: FieldErrors<ColumnFormValues>
}

export const LabelsColumnConfiguration = ({
  control,
  errors,
}: LabelsColumnConfigurationProps) => {
  const { t } = useTranslation()
  const noteTypesQuery = useNoteTypesQuery()

  const noteTypes = noteTypesQuery.data ?? []

  return (
    <Stack spacing={2}>
      <FormControl error={Boolean(errors.allowMultipleLabels)}>
        <Typography component="span" variant="body2">
          {t('settings.columns.labelsConfiguration.selectionMode')}
        </Typography>
        <Controller
          control={control}
          name="allowMultipleLabels"
          render={({ field }) => (
            <RadioGroup
              onChange={(_, value) => field.onChange(value === 'multiple')}
              row
              value={field.value ? 'multiple' : 'single'}
            >
              <FormControlLabel
                control={<Radio />}
                label={t(
                  'settings.columns.labelsConfiguration.selection.single'
                )}
                value="single"
              />
              <FormControlLabel
                control={<Radio />}
                label={t(
                  'settings.columns.labelsConfiguration.selection.multiple'
                )}
                value="multiple"
              />
            </RadioGroup>
          )}
        />
        {errors.allowMultipleLabels ? (
          <FormHelperText>{errors.allowMultipleLabels.message}</FormHelperText>
        ) : null}
      </FormControl>

      <Controller
        control={control}
        name="labelSourceIds"
        render={({ field }) => (
          <FormControl
            disabled={noteTypesQuery.isLoading || noteTypesQuery.isError}
            error={Boolean(errors.labelSourceIds)}
            fullWidth
          >
            <InputLabel id="label-field-sources-label" shrink>
              {t('settings.columns.labelsConfiguration.sources')}
            </InputLabel>
            <Select
              displayEmpty
              label={t('settings.columns.labelsConfiguration.sources')}
              labelId="label-field-sources-label"
              multiple
              onChange={field.onChange}
              renderValue={(selectedSourceIds) => {
                if (selectedSourceIds.length === 0) {
                  return t(
                    'settings.columns.labelsConfiguration.allSourcesValue'
                  )
                }

                return selectedSourceIds
                  .map((sourceId) => {
                    if (sourceId === sharedLabelSourceValue) {
                      return t('settings.noteLabels.sources.shared')
                    }

                    return (
                      noteTypes.find((noteType) => noteType.id === sourceId)
                        ?.title ?? t('settings.noteLabels.sources.missing')
                    )
                  })
                  .join(', ')
              }}
              value={field.value}
            >
              <MenuItem value={sharedLabelSourceValue}>
                <Checkbox
                  checked={field.value.includes(sharedLabelSourceValue)}
                />
                <ListItemText
                  primary={t('settings.noteLabels.sources.shared')}
                />
              </MenuItem>
              {noteTypes.map((noteType) => (
                <MenuItem key={noteType.id} value={noteType.id}>
                  <Checkbox checked={field.value.includes(noteType.id)} />
                  <ListItemText primary={noteType.title} />
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              {errors.labelSourceIds?.message ??
                t('settings.columns.labelsConfiguration.sourcesHint')}
            </FormHelperText>
          </FormControl>
        )}
      />

      {noteTypesQuery.isLoading ? (
        <Stack alignItems="center" direction="row" spacing={1}>
          <CircularProgress size={18} />
          <Typography color="text.secondary" variant="body2">
            {t('settings.columns.labelsConfiguration.loadingSources')}
          </Typography>
        </Stack>
      ) : null}

      {noteTypesQuery.isError ? (
        <Alert severity="error">
          {t('settings.columns.labelsConfiguration.sourcesError')}
        </Alert>
      ) : null}
    </Stack>
  )
}
