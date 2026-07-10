import { Layout } from './components/layout/layout'
import { AppProviders } from './components/app-providers/app-providers'

export const App = () => {
  return (
    <AppProviders>
      <Layout />
    </AppProviders>
  )
}
