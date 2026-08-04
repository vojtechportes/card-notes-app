import { RelayError } from './relay-error'

export class AuthorizationService {
  public getBearerToken(request: Request): string {
    const authorization = request.headers.get('authorization')

    if (authorization === null || !authorization.startsWith('Bearer ')) {
      throw new RelayError(
        401,
        'missing_connection_token',
        'A connection token is required'
      )
    }

    const token = authorization.slice('Bearer '.length)

    if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) {
      throw new RelayError(
        401,
        'invalid_connection_token',
        'The connection token is invalid'
      )
    }

    return token
  }

  public getWebSocketToken(request: Request): string {
    const protocols = request.headers
      .get('sec-websocket-protocol')
      ?.split(',')
      .map((protocol) => protocol.trim())
    const tokenProtocol = protocols?.find((protocol) =>
      protocol.startsWith('notestack.token.')
    )

    if (
      protocols?.includes('notestack.relay.v1') !== true ||
      tokenProtocol === undefined
    ) {
      throw new RelayError(
        401,
        'missing_connection_token',
        'A WebSocket connection token is required'
      )
    }

    const token = tokenProtocol.slice('notestack.token.'.length)

    if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) {
      throw new RelayError(
        401,
        'invalid_connection_token',
        'The connection token is invalid'
      )
    }

    return token
  }
}
