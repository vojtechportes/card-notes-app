import type { RelayEnvironment } from '../../src/types/relay-environment'

declare global {
  namespace Cloudflare {
    interface Env extends RelayEnvironment {}

    interface GlobalProps {
      mainModule: typeof import('../../src/index')
      durableNamespaces:
        'RelayWorkspaceDurableObject' | 'RelayMetricsDurableObject'
    }
  }
}

export {}
