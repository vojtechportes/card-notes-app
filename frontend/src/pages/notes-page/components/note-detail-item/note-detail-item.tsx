import { Stack, Typography } from '@mui/material'
import type { PropsWithChildren } from 'react'

interface NoteDetailItemProps extends PropsWithChildren {
  label: string
}

export const NoteDetailItem = ({ children, label }: NoteDetailItemProps) => {
  return (
    <Stack spacing={0.25}>
      <Typography component="h3" variant="subtitle2">
        {label}
      </Typography>
      {children}
    </Stack>
  )
}
