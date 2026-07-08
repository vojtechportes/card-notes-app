import { Paper, Stack, Typography } from '@mui/material';
import type { PropsWithChildren } from 'react';

interface SettingsSectionProps extends PropsWithChildren {
  description: string;
  title: string;
}

export const SettingsSection = ({
  children,
  description,
  title,
}: SettingsSectionProps) => {
  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack spacing={2.5}>
        <Stack spacing={0.75}>
          <Typography component="h3" variant="h6">
            {title}
          </Typography>
          <Typography color="text.secondary">{description}</Typography>
        </Stack>

        {children}
      </Stack>
    </Paper>
  );
};
