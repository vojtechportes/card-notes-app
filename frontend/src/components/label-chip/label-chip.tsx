import { Chip } from '@mui/material'
import type { ChipProps } from '@mui/material'
import { getAccessibleLabelChipTextColor } from './utils/get-accessible-label-chip-text-color.util'

interface LabelChipProps {
  chipProps?: Omit<ChipProps, 'color' | 'label' | 'size' | 'sx' | 'variant'>
  color: string
  title: string
}

const fallbackColor = '#475E75'
const hexColorPattern = /^#[0-9A-F]{6}$/i

export const LabelChip = ({ chipProps, color, title }: LabelChipProps) => {
  const backgroundColor = hexColorPattern.test(color) ? color : fallbackColor

  return (
    <Chip
      {...chipProps}
      label={title}
      size="small"
      variant="filled"
      sx={{
        bgcolor: backgroundColor,
        color: getAccessibleLabelChipTextColor(backgroundColor),
        maxWidth: '100%',
      }}
    />
  )
}
