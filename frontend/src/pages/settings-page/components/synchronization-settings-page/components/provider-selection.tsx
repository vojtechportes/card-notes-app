import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined'
import { Alert, Button, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { SyncProviderAvailabilityDto } from '../../../../../types/api'
import type { OAuthProviderEnum } from '../../../../../types/oauth-provider-enum'

interface ProviderSelectionProps {
  busy: boolean
  oauthAvailable: boolean
  onSelect: (provider: OAuthProviderEnum) => void
  providers: SyncProviderAvailabilityDto[]
}

export const ProviderSelection = ({
  busy,
  oauthAvailable,
  onSelect,
  providers,
}: ProviderSelectionProps) => {
  const { t } = useTranslation()

  return (
    <Stack spacing={1.5}>
      <Typography>{t('settings.synchronization.providers.prompt')}</Typography>
      {!oauthAvailable ? (
        <Alert severity="info">
          {t('settings.synchronization.providers.desktopOnly')}
        </Alert>
      ) : null}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        {providers.map((provider) => (
          <Button
            key={provider.provider}
            disabled={busy || !oauthAvailable || !provider.available}
            onClick={() => onSelect(provider.provider as OAuthProviderEnum)}
            startIcon={<CloudOutlinedIcon />}
            variant="outlined"
          >
            {provider.available
              ? t(`settings.synchronization.providers.${provider.provider}`)
              : t('settings.synchronization.providers.unavailableLabel', {
                  provider: t(
                    `settings.synchronization.providers.${provider.provider}`
                  ),
                })}
          </Button>
        ))}
      </Stack>
    </Stack>
  )
}
