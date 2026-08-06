import {
  BadRequestException,
  type ArgumentsHost,
  HttpStatus,
} from '@nestjs/common'
import type { HttpAdapterHost } from '@nestjs/core'
import { describe, expect, it, vi } from 'vitest'
import type { RuntimeDiagnosticsService } from '../../../src/modules/runtime-diagnostics/runtime-diagnostics.service'
import { RuntimeExceptionFilter } from '../../../src/modules/runtime-diagnostics/runtime-exception.filter'

interface FilterHarness {
  diagnostics: {
    recordApiFailure: ReturnType<typeof vi.fn>
  }
  filter: RuntimeExceptionFilter
  host: ArgumentsHost
  httpAdapter: {
    end: ReturnType<typeof vi.fn>
    isHeadersSent: ReturnType<typeof vi.fn>
    reply: ReturnType<typeof vi.fn>
  }
  response: object
}

const createHarness = (): FilterHarness => {
  const request = {
    baseUrl: '/api/sync',
    body: { accessToken: 'must-not-be-read' },
    headers: { authorization: 'Bearer must-not-be-read' },
    method: 'post',
    route: { path: '/pairing/:id' },
    url: '/pairing/private-id?code=must-not-be-read',
  }
  const response = {}
  const diagnostics = {
    recordApiFailure: vi.fn(),
  }
  const httpAdapter = {
    end: vi.fn(),
    isHeadersSent: vi.fn(() => false),
    reply: vi.fn(),
  }
  const httpAdapterHost = {
    httpAdapter,
  } as unknown as HttpAdapterHost
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost

  return {
    diagnostics,
    filter: new RuntimeExceptionFilter(
      httpAdapterHost,
      diagnostics as unknown as RuntimeDiagnosticsService
    ),
    host,
    httpAdapter,
    response,
  }
}

describe(RuntimeExceptionFilter.name, () => {
  it('records a route template and preserves an HttpException response', () => {
    const harness = createHarness()
    const error = new BadRequestException('Existing response message')

    harness.filter.catch(error, harness.host)

    expect(harness.diagnostics.recordApiFailure).toHaveBeenCalledWith({
      error,
      method: 'POST',
      route: '/api/sync/pairing/:id',
      status: HttpStatus.BAD_REQUEST,
    })
    expect(harness.httpAdapter.reply).toHaveBeenCalledWith(
      harness.response,
      {
        error: 'Bad Request',
        message: 'Existing response message',
        statusCode: HttpStatus.BAD_REQUEST,
      },
      HttpStatus.BAD_REQUEST
    )
  })

  it('returns Nest-compatible generic output for unknown errors', () => {
    const harness = createHarness()
    const error = new Error('Provider response must remain private')

    harness.filter.catch(error, harness.host)

    expect(harness.diagnostics.recordApiFailure).toHaveBeenCalledWith({
      error,
      method: 'POST',
      route: '/api/sync/pairing/:id',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    })
    expect(harness.httpAdapter.reply).toHaveBeenCalledWith(
      harness.response,
      {
        message: 'Internal server error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    )
  })

  it('preserves a structurally valid HTTP error response', () => {
    const harness = createHarness()
    const error = {
      message: 'Unexpected token in JSON at position 1',
      statusCode: HttpStatus.BAD_REQUEST,
    }

    harness.filter.catch(error, harness.host)

    expect(harness.diagnostics.recordApiFailure).toHaveBeenCalledWith({
      error,
      method: 'POST',
      route: '/api/sync/pairing/:id',
      status: HttpStatus.BAD_REQUEST,
    })
    expect(harness.httpAdapter.reply).toHaveBeenCalledWith(
      harness.response,
      {
        message: error.message,
        statusCode: HttpStatus.BAD_REQUEST,
      },
      HttpStatus.BAD_REQUEST
    )
  })
})
