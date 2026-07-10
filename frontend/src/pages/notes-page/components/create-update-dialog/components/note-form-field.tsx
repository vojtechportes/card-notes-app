import { TextField } from '@mui/material'
import type {
  Control,
  UseFormClearErrors,
  UseFormSetError,
} from 'react-hook-form'
import { Controller } from 'react-hook-form'
import type { ColumnDto } from '../../../../../types/api'
import type { FormValues } from '../types/form-values'
import type { NoteFormImageValue } from '../types/note-form-image-value'
import { NoteImageDropZone } from './note-image-drop-zone'

interface NoteFormFieldProps {
  autoFocus: boolean
  clearErrors: UseFormClearErrors<FormValues>
  column: ColumnDto
  control: Control<FormValues>
  setError: UseFormSetError<FormValues>
}

export const NoteFormField = ({
  autoFocus,
  clearErrors,
  column,
  control,
  setError,
}: NoteFormFieldProps) => {
  const fieldName = `values.${column.id}` as const

  if (column.type === 'image') {
    return (
      <Controller
        control={control}
        name={fieldName}
        render={({ field, fieldState }) => (
          <NoteImageDropZone
            errorMessage={fieldState.error?.message}
            label={column.title}
            onChange={(value) => field.onChange(value)}
            onFileError={(message) => {
              if (message) {
                setError(fieldName, {
                  message,
                  type: 'manual',
                })
                return
              }

              clearErrors(fieldName)
            }}
            value={(field.value as NoteFormImageValue | null) ?? null}
          />
        )}
      />
    )
  }

  const isDateField = column.type === 'date'
  const isNumberField = column.type === 'number'
  const isTextField = column.type === 'text'

  return (
    <Controller
      control={control}
      name={fieldName}
      render={({ field, fieldState }) => (
        <TextField
          autoFocus={autoFocus}
          error={!!fieldState.error}
          fullWidth
          helperText={fieldState.error?.message}
          slotProps={{
            inputLabel: isDateField ? { shrink: true } : undefined,
            htmlInput: isNumberField ? { inputMode: 'decimal' } : undefined,
          }}
          label={column.title}
          minRows={isTextField ? 3 : undefined}
          multiline={isTextField}
          onChange={(event) => {
            clearErrors(fieldName)
            field.onChange(event.target.value)
          }}
          type={isDateField ? 'date' : 'text'}
          value={typeof field.value === 'string' ? field.value : ''}
        />
      )}
    />
  )
}
