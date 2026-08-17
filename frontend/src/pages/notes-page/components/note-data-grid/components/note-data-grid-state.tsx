import { Card, CardContent, Stack, Typography } from '@mui/material'

interface NoteDataGridStateProps {
  description: string
  title: string
}

export const NoteDataGridState = ({
  description,
  title,
}: NoteDataGridStateProps) => {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1}>
          <Typography component="h3" variant="h6">
            {title}
          </Typography>
          <Typography color="text.secondary">{description}</Typography>
        </Stack>
      </CardContent>
    </Card>
  )
}
