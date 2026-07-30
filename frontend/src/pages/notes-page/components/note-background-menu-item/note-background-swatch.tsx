import { Box, ButtonBase, Tooltip } from '@mui/material'
import type { MouseEventHandler } from 'react'

interface NoteBackgroundSwatchProps {
  color: string
  isSelected: boolean
  label: string
  onSelect: MouseEventHandler<HTMLButtonElement>
}

export const NoteBackgroundSwatch = ({
  color,
  isSelected,
  label,
  onSelect,
}: NoteBackgroundSwatchProps) => {
  return (
    <Tooltip title={label}>
      <ButtonBase
        aria-label={label}
        aria-pressed={isSelected}
        onClick={onSelect}
        sx={{
          borderRadius: '50%',
          p: 0.5,
          transition: (theme) =>
            theme.transitions.create(['background-color', 'transform'], {
              duration: theme.transitions.duration.shorter,
            }),
          '&:hover': {
            bgcolor: 'action.hover',
            transform: 'scale(1.12)',
          },
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2,
          },
        }}
      >
        <Box
          sx={{
            bgcolor: color,
            border: 1,
            borderColor: 'divider',
            borderRadius: '50%',
            boxShadow: isSelected
              ? (theme) => `0 0 0 2px ${theme.palette.primary.main}`
              : 'none',
            height: 26,
            width: 26,
          }}
        />
      </ButtonBase>
    </Tooltip>
  )
}
