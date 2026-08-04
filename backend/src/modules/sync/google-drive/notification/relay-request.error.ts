export class RelayRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | null,
    message: string
  ) {
    super(message)
    this.name = RelayRequestError.name
  }
}
