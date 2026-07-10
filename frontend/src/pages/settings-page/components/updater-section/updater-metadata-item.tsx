import { Chip, Stack, Typography } from '@mui/material'

interface UpdaterMetadataItemProps {
  label: string
  value: string
}

export const UpdaterMetadataItem = ({
  label,
  value,
}: UpdaterMetadataItemProps) => {
  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
      <Chip label={value} size="small" variant="outlined" />
    </Stack>
  )
}
