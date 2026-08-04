import {
  Alert,
  Checkbox,
  FormControlLabel,
  FormHelperText,
  Stack,
} from '@mui/material'
import { useCallback, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { UpdaterState } from '../../../../../types/notestack-updater'
import { useUpdaterPreferences } from '../../../hooks/use-updater-preferences/use-updater-preferences'
import { isUpdaterPreferenceChangeDisabled } from '../utils/is-updater-preference-change-disabled.util'

interface PrereleaseUpdatesControlProps {
  updaterState: UpdaterState
}

export const PrereleaseUpdatesControl = ({
  updaterState,
}: PrereleaseUpdatesControlProps) => {
  const { t } = useTranslation()
  const {
    allowPrerelease,
    error,
    isLoading,
    isSaving,
    isUpdaterAvailable,
    setAllowPrerelease,
  } = useUpdaterPreferences()

  const handleChange = useCallback(
    (_event: ChangeEvent<HTMLInputElement>, checked: boolean) => {
      void setAllowPrerelease(checked)
    },
    [setAllowPrerelease]
  )

  const isDisabled =
    !isUpdaterAvailable ||
    isLoading ||
    isSaving ||
    isUpdaterPreferenceChangeDisabled(updaterState)

  return (
    <Stack spacing={0.5}>
      <FormControlLabel
        control={
          <Checkbox
            checked={allowPrerelease}
            disabled={isDisabled}
            onChange={handleChange}
          />
        }
        label={t('settings.updater.fields.allowPrerelease')}
      />
      <FormHelperText>
        {t('settings.updater.hints.allowPrerelease')}
      </FormHelperText>
      {error ? <Alert severity="error">{error}</Alert> : null}
    </Stack>
  )
}
