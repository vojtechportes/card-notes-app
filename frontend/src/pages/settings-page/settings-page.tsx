import { Divider, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

const SECTION_KEYS = ['columns', 'general', 'exportImport', 'dangerZone'];

export const SettingsPage = () => {
  const { t } = useTranslation();

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" component="h2">
          {t('settings.title')}
        </Typography>
        <Typography color="text.secondary">{t('settings.description')}</Typography>
      </Stack>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={3} divider={<Divider flexItem />}>
          {SECTION_KEYS.map((key) => (
            <Stack key={key} spacing={1}>
              <Typography variant="h6" component="h3">
                {t(`settings.sections.${key}.title`)}
              </Typography>
              <Typography color="text.secondary">
                {t(`settings.sections.${key}.description`)}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
};

