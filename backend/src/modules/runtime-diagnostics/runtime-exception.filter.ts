import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  type HttpServer,
} from '@nestjs/common'
import { HttpAdapterHost } from '@nestjs/core'
import { RuntimeDiagnosticsService } from './runtime-diagnostics.service'
import { getRuntimeHttpErrorResponse } from './utils/get-runtime-http-error-response.util'
import { getSanitizedRouteTemplate } from './utils/get-sanitized-route-template.util'

interface RuntimeHttpRequest {
  baseUrl?: unknown
  method?: unknown
  route?: {
    path?: unknown
  }
}

@Catch()
export class RuntimeExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly diagnostics: RuntimeDiagnosticsService
  ) {}

  catch(error: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp()
    const request = context.getRequest<RuntimeHttpRequest>()
    const response = context.getResponse()
    const httpAdapter = this.httpAdapterHost.httpAdapter as HttpServer
    const errorResponse = getRuntimeHttpErrorResponse(error)
    const method =
      typeof request.method === 'string'
        ? request.method.toUpperCase()
        : 'UNKNOWN'

    this.diagnostics.recordApiFailure({
      error,
      method,
      route: getSanitizedRouteTemplate(request),
      status: errorResponse.status,
    })

    if (httpAdapter.isHeadersSent(response)) {
      httpAdapter.end(response)
      return
    }

    httpAdapter.reply(response, errorResponse.body, errorResponse.status)
  }
}
