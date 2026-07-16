import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt'
import UpdateIcon from '@mui/icons-material/Update'
import { Button } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { UpdaterActionConfig } from '../types/updater-action-config'
import { getUpdaterActionLabel } from '../utils/get-updater-action-label.util'

interface UpdaterActionButtonProps {
  actionConfig: UpdaterActionConfig
  isActionPending: boolean
  onAction: () => Promise<void>
}

export const UpdaterActionButton = ({
  actionConfig,
  isActionPending,
  onAction,
}: UpdaterActionButtonProps) => {
  const { t } = useTranslation()
  const buttonIsPending = actionConfig.isPending || isActionPending

  return (
    <Button
      disabled={actionConfig.disabled || buttonIsPending}
      onClick={() => {
        void onAction()
      }}
      startIcon={
        actionConfig.key === 'install' ? (
          <SystemUpdateAltIcon />
        ) : (
          <UpdateIcon />
        )
      }
      variant="contained"
    >
      {getUpdaterActionLabel(actionConfig, t)}
    </Button>
  )
}
