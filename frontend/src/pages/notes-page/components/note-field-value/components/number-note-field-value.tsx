import { Typography } from '@mui/material'

interface NumberNoteFieldValueProps {
  value: number | string
}

export const NumberNoteFieldValue = ({ value }: NumberNoteFieldValueProps) => {
  return (
    <Typography sx={{ overflowWrap: 'anywhere' }} variant="body2">
      {String(value)}
    </Typography>
  )
}
