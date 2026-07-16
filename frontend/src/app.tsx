import { AppProviders } from './components/app-providers/app-providers'
import { Layout } from './components/layout/layout'
import { SideDrawerProvider } from './components/side-drawer'
import { StartupGate } from './components/startup-gate/startup-gate'

export const App = () => {
  return (
    <AppProviders>
      <StartupGate>
        <SideDrawerProvider>
          <Layout />
        </SideDrawerProvider>
      </StartupGate>
    </AppProviders>
  )
}
