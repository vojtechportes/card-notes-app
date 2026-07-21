import { Box, Stack, TextField } from '@mui/material'
import { useController, type Control } from 'react-hook-form'
import type { LabelFormValues } from '../types/label-form-values'

interface LabelColorFieldProps {
  control: Control<LabelFormValues>
  helperText: string
  label: string
  pickerLabel: string
}

const defaultPickerColor = '#0070F2'
const hexColorPattern = /^#[0-9A-F]{6}$/i

export const LabelColorField = ({
  control,
  helperText,
  label,
  pickerLabel,
}: LabelColorFieldProps) => {
  const {
    field,
    fieldState: { error },
  } = useController({ control, name: 'color' })
  const pickerColor = hexColorPattern.test(field.value)
    ? field.value
    : defaultPickerColor

  return (
    <Stack alignItems="flex-start" direction="row" spacing={1.5}>
      <TextField
        {...field}
        error={Boolean(error)}
        fullWidth
        helperText={error?.message ?? helperText}
        label={label}
      />
      <Box
        component="input"
        aria-label={pickerLabel}
        onBlur={field.onBlur}
        onChange={(event) => field.onChange(event.target.value.toUpperCase())}
        type="color"
        value={pickerColor}
        sx={{ height: 56, minWidth: 56 }}
      />
    </Stack>
  )
}
