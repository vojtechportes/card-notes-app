import { Autocomplete, Box, TextField } from '@mui/material'
import { useMemo } from 'react'
import { Controller } from 'react-hook-form'
import type { Control } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { LabelChip } from '../../../../../components/label-chip/label-chip'
import { NoteLabelOption } from './note-label-option'
import type { ColumnDto, LabelDto } from '../../../../../types/api'
import { getLabelOptionsForColumn } from '../../../utils/get-label-options-for-column.util'
import { getLabelsColumnConfig } from '../../../utils/get-labels-column-config.util'
import type { FormValues } from '../types/form-values'

interface NoteLabelFieldProps {
  autoFocus: boolean
  column: ColumnDto
  control: Control<FormValues>
  labels: LabelDto[]
}

export const NoteLabelField = ({
  autoFocus,
  column,
  control,
  labels,
}: NoteLabelFieldProps) => {
  const { t } = useTranslation()
  const config = getLabelsColumnConfig(column)
  const fieldName = `values.${column.id}` as const
  const labelById = useMemo(
    () => new Map(labels.map((label) => [label.id, label])),
    [labels]
  )

  return (
    <Controller
      control={control}
      name={fieldName}
      render={({ field, fieldState }) => {
        const selectedLabelIds = Array.isArray(field.value)
          ? field.value.filter(
              (labelId): labelId is string => typeof labelId === 'string'
            )
          : []
        const options = getLabelOptionsForColumn(
          column,
          labels,
          selectedLabelIds
        )
        const missingLabelIds = selectedLabelIds.filter(
          (labelId) => !labelById.has(labelId)
        )

        if (config?.allowMultiple) {
          return (
            <Box>
              <Autocomplete
                size="small"
                autoFocus={autoFocus}
                getOptionKey={(option) => option.id}
                getOptionLabel={(option) => option.title}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                multiple
                onChange={(_, selectedLabels) => {
                  field.onChange([
                    ...new Set(selectedLabels.map((label) => label.id)),
                  ])
                }}
                options={options}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    label={column.title}
                  />
                )}
                renderOption={(props, label) => (
                  <NoteLabelOption {...props} key={label.id} label={label} />
                )}
                renderValue={(selectedLabels, getItemProps) =>
                  selectedLabels.map((label, index) => {
                    const { key, ...chipProps } = getItemProps({ index })

                    return (
                      <LabelChip
                        chipProps={chipProps}
                        color={label.color}
                        key={key}
                        title={label.title}
                      />
                    )
                  })
                }
                value={selectedLabelIds.flatMap((labelId) => {
                  const label = labelById.get(labelId)
                  return label ? [label] : []
                })}
              />
              {missingLabelIds.map((labelId) => (
                <LabelChip
                  color="#475E75"
                  key={labelId}
                  chipProps={{
                    onDelete: () => {
                      field.onChange(
                        selectedLabelIds.filter(
                          (selectedLabelId) => selectedLabelId !== labelId
                        )
                      )
                    },
                  }}
                  title={t('notes.labels.unavailable')}
                />
              ))}
            </Box>
          )
        }

        const selectedLabel = labelById.get(selectedLabelIds[0] ?? '') ?? null

        return (
          <Box>
            <Autocomplete
              size="small"
              autoFocus={autoFocus}
              getOptionKey={(option) => option.id}
              getOptionLabel={(option) => option.title}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              onChange={(_, label) => {
                field.onChange(label ? [label.id] : [])
              }}
              options={options}
              renderInput={(params) => (
                <TextField
                  {...params}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  label={column.title}
                />
              )}
              renderOption={(props, label) => (
                <NoteLabelOption {...props} key={label.id} label={label} />
              )}
              renderValue={(label, getItemProps) => (
                <LabelChip
                  chipProps={getItemProps()}
                  color={label.color}
                  title={label.title}
                />
              )}
              value={selectedLabel}
            />
            {!selectedLabel && missingLabelIds.length > 0 ? (
              <LabelChip
                color="#475E75"
                chipProps={{
                  onDelete: () => {
                    field.onChange([])
                  },
                }}
                title={t('notes.labels.unavailable')}
              />
            ) : null}
          </Box>
        )
      }}
    />
  )
}
