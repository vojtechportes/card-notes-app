import { Box } from '@mui/material'
import { AppProviders } from './components/app-providers/app-providers'
import { Layout } from './components/layout/layout'
import { SideDrawerProvider } from './components/side-drawer'
import { StartupGate } from './components/startup-gate/startup-gate'
import { WindowTitleBar } from './components/window-title-bar/window-title-bar'

export const App = () => {
  return (
    <AppProviders>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        <WindowTitleBar />
        <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
          <StartupGate>
            <SideDrawerProvider>
              <Layout />
            </SideDrawerProvider>
          </StartupGate>
        </Box>
      </Box>
    </AppProviders>
  )
}
