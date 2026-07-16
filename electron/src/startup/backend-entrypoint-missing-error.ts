export class BackendEntrypointMissingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackendEntrypointMissingError'
  }
}
