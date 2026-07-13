import { Stack, Typography } from '@mui/material'

interface NoteTypeMetadataItemProps {
  label: string
  value: string
}

export const NoteTypeMetadataItem = ({
  label,
  value,
}: NoteTypeMetadataItemProps) => {
  return (
    <Stack spacing={0.25}>
      <Typography component="h3" variant="subtitle2">
        {label}
      </Typography>
      <Typography>{value}</Typography>
    </Stack>
  )
}
