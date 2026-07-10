import { Layout } from './components/layout/layout'
import { SideDrawerProvider } from './components/side-drawer'
import { AppProviders } from './components/app-providers/app-providers'

export const App = () => {
  return (
    <AppProviders>
      <SideDrawerProvider>
        <Layout />
      </SideDrawerProvider>
    </AppProviders>
  )
}
