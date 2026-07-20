import { Box } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { windowTitleBarHeight } from '../../constants/window-title-bar'
import { WindowCloseIcon } from './components/window-close-icon'
import { WindowControlButton } from './components/window-control-button'
import { WindowMaximizeIcon } from './components/window-maximize-icon'
import { WindowMinimizeIcon } from './components/window-minimize-icon'
import { WindowRestoreIcon } from './components/window-restore-icon'
import { useWindowControls } from './hooks/use-window-controls'

export const WindowTitleBar = () => {
  const { t } = useTranslation()
  const { close, isMaximized, minimize, toggleMaximize } = useWindowControls()
  const maximizeLabel = isMaximized
    ? t('windowControls.restore')
    : t('windowControls.maximize')

  return (
    <Box
      component="header"
      sx={{
        WebkitAppRegion: 'drag',
        alignItems: 'center',
        bgcolor: 'secondary.main',
        display: 'flex',
        flexShrink: 0,
        height: windowTitleBarHeight,
        justifyContent: 'flex-end',
        position: 'relative',
        zIndex: (theme) => theme.zIndex.modal + 1,
      }}
    >
      <WindowControlButton
        label={t('windowControls.minimize')}
        onClick={minimize}
      >
        <WindowMinimizeIcon />
      </WindowControlButton>
      <WindowControlButton label={maximizeLabel} onClick={toggleMaximize}>
        {isMaximized ? <WindowRestoreIcon /> : <WindowMaximizeIcon />}
      </WindowControlButton>
      <WindowControlButton
        isClose
        label={t('windowControls.close')}
        onClick={close}
      >
        <WindowCloseIcon />
      </WindowControlButton>
    </Box>
  )
}
