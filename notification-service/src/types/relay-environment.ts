export interface RelayEnvironment {
  WORKSPACES: DurableObjectNamespace<
    import('../runtime/relay-workspace-durable-object').RelayWorkspaceDurableObject
  >
  METRICS: DurableObjectNamespace<
    import('../runtime/relay-metrics-durable-object').RelayMetricsDurableObject
  >
  PUBLIC_BASE_URL: string
  METRICS_AUTH_TOKEN?: string
}
