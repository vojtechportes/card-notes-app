export class SyncProviderUnavailableError extends Error {
  constructor(provider: string) {
    super(`Synchronization provider is unavailable: ${provider}.`)
    this.name = 'SyncProviderUnavailableError'
  }
}
