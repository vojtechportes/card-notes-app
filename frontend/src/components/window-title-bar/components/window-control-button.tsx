import { alpha, IconButton, Tooltip } from '@mui/material'
import type { ReactNode } from 'react'
import { windowTitleBarHeight } from '../../../constants/window-title-bar'

interface WindowControlButtonProps {
  children: ReactNode
  isClose?: boolean
  label: string
  onClick: () => void
}

export const WindowControlButton = ({
  children,
  isClose = false,
  label,
  onClick,
}: WindowControlButtonProps) => {
  return (
    <Tooltip title={label} enterDelay={750}>
      <IconButton
        aria-label={label}
        disableRipple
        onClick={onClick}
        sx={(theme) => ({
          WebkitAppRegion: 'no-drag',
          borderRadius: 0,
          color: theme.palette.common.white,
          height: windowTitleBarHeight,
          p: 0,
          width: 46,
          '& .MuiSvgIcon-root': {
            opacity: 0.9,
          },
          '&:hover': {
            bgcolor: isClose
              ? theme.palette.error.main
              : alpha(theme.palette.common.white, 0.12),
          },
        })}
      >
        {children}
      </IconButton>
    </Tooltip>
  )
}
