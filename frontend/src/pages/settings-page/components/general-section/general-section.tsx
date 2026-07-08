import { Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SettingsSection } from '../settings-section';

export const GeneralSection = () => {
  const { t } = useTranslation();

  return (
    <SettingsSection
      description={t('settings.sections.general.description')}
      title={t('settings.sections.general.title')}
    >
      <Typography color="text.secondary">
        {t('settings.sections.general.placeholder')}
      </Typography>
    </SettingsSection>
  );
};
