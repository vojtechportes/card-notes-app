import type { RelayErrorBody } from '../types/relay-error-body'

export class HttpResponseService {
  public json(value: unknown, status = 200, headers?: HeadersInit): Response {
    return Response.json(value, {
      status,
      headers: {
        'cache-control': 'no-store',
        ...headers,
      },
    })
  }

  public noContent(status = 204): Response {
    return new Response(null, {
      status,
      headers: { 'cache-control': 'no-store' },
    })
  }

  public error(status: number, code: string, message: string): Response {
    const body: RelayErrorBody = {
      error: { code, message },
    }

    return this.json(body, status)
  }
}
