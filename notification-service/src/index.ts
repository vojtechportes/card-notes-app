import { RelayMetricsDurableObject } from './runtime/relay-metrics-durable-object'
import { RelayWorkspaceDurableObject } from './runtime/relay-workspace-durable-object'
import { RelayWorkerService } from './services/relay-worker.service'
import type { RelayEnvironment } from './types/relay-environment'

const workerService = new RelayWorkerService()

export { RelayMetricsDurableObject, RelayWorkspaceDurableObject }

export default {
  fetch(request: Request, environment: RelayEnvironment): Promise<Response> {
    return workerService.handle(request, environment)
  },
} satisfies ExportedHandler<RelayEnvironment>
