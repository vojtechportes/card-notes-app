import { Box } from '@mui/material'
import type { HTMLAttributes } from 'react'
import { LabelChip } from '../../../../../components/label-chip/label-chip'
import type { LabelDto } from '../../../../../types/api'

interface NoteLabelOptionProps extends HTMLAttributes<HTMLLIElement> {
  label: LabelDto
}

export const NoteLabelOption = ({ label, ...props }: NoteLabelOptionProps) => {
  return (
    <Box component="li" {...props}>
      <LabelChip color={label.color} title={label.title} />
    </Box>
  )
}
