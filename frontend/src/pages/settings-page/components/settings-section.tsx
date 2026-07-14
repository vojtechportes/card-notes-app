import { Paper, Stack, Typography } from '@mui/material'
import type { PropsWithChildren } from 'react'

interface SettingsSectionProps extends PropsWithChildren {
  description?: string
  title?: string
}

export const SettingsSection = ({
  children,
  description,
  title,
}: SettingsSectionProps) => {
  const hasHeader = Boolean(title || description)

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack spacing={2.5}>
        {hasHeader ? (
          <Stack spacing={0.75}>
            {title ? (
              <Typography component="h3" variant="h6">
                {title}
              </Typography>
            ) : null}
            {description ? (
              <Typography color="text.secondary">{description}</Typography>
            ) : null}
          </Stack>
        ) : null}

        {children}
      </Stack>
    </Paper>
  )
}
