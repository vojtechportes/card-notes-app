import { Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { SettingsSection } from '../settings-section'

export const DangerZoneSection = () => {
  const { t } = useTranslation()

  return (
    <SettingsSection
      description={t('settings.sections.dangerZone.description')}
      title={t('settings.sections.dangerZone.title')}
    >
      <Typography color="text.secondary">
        {t('settings.sections.dangerZone.placeholder')}
      </Typography>
    </SettingsSection>
  )
}
