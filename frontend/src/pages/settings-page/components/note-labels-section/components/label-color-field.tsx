import { Box, InputAdornment, TextField } from '@mui/material'
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
    <TextField
      size="small"
      {...field}
      error={Boolean(error)}
      fullWidth
      helperText={error?.message ?? helperText}
      label={label}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <Box
                component="label"
                sx={{
                  bgcolor: pickerColor,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 0.75,
                  cursor: 'pointer',
                  height: 20,
                  overflow: 'hidden',
                  position: 'relative',
                  width: 20,
                  '&:focus-within': {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                    outlineOffset: 2,
                  },
                }}
              >
                <Box
                  component="input"
                  aria-label={pickerLabel}
                  onBlur={field.onBlur}
                  onChange={(event) =>
                    field.onChange(event.target.value.toUpperCase())
                  }
                  type="color"
                  value={pickerColor}
                  sx={{
                    cursor: 'pointer',
                    height: '100%',
                    inset: 0,
                    opacity: 0,
                    position: 'absolute',
                    width: '100%',
                  }}
                />
              </Box>
            </InputAdornment>
          ),
        },
      }}
    />
  )
}
