export class WebSocketProtocolError extends Error {
  public constructor(
    public readonly closeCode: number,
    public readonly closeReason: string
  ) {
    super(closeReason)
    this.name = 'WebSocketProtocolError'
  }
}
