import { Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SettingsSection } from '../settings-section';

export const ExportImportSection = () => {
  const { t } = useTranslation();

  return (
    <SettingsSection
      description={t('settings.sections.exportImport.description')}
      title={t('settings.sections.exportImport.title')}
    >
      <Typography color="text.secondary">
        {t('settings.sections.exportImport.placeholder')}
      </Typography>
    </SettingsSection>
  );
};
