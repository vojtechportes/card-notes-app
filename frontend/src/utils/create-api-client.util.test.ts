import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import { describe, expect, it } from 'vitest'
import { createApiClient } from './create-api-client.util'

const createConfigAdapter = (
  onConfig: (config: InternalAxiosRequestConfig) => void
): AxiosAdapter => {
  return async (config) => {
    onConfig(config)

    return {
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    } satisfies AxiosResponse
  }
}

describe('createApiClient', () => {
  it('adds the default base url through a request interceptor', async () => {
    const client = createApiClient('http://localhost:3000/api')
    let appliedBaseUrl: string | undefined

    await client.get('/health', {
      adapter: createConfigAdapter((config) => {
        appliedBaseUrl = config.baseURL
      }),
    })

    expect(appliedBaseUrl).toBe('http://localhost:3000/api')
  })

  it('keeps request-specific base urls when callers provide them', async () => {
    const client = createApiClient('http://localhost:3000/api')
    let appliedBaseUrl: string | undefined

    await client.get('/health', {
      baseURL: 'http://localhost:4000/api',
      adapter: createConfigAdapter((config) => {
        appliedBaseUrl = config.baseURL
      }),
    })

    expect(appliedBaseUrl).toBe('http://localhost:4000/api')
  })

  it('adds json content type through a request interceptor', async () => {
    const client = createApiClient('http://localhost:3000/api')
    let contentType: string | undefined

    await client.post(
      '/notes',
      {},
      {
        adapter: createConfigAdapter((config) => {
          contentType = String(config.headers.get('Content-Type'))
        }),
      }
    )

    expect(contentType).toBe('application/json')
  })
  it('keeps request-specific content type headers when callers provide them', async () => {
    const client = createApiClient('http://localhost:3000/api')
    let contentType: string | undefined

    await client.post(
      '/notes',
      {},
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        adapter: createConfigAdapter((config) => {
          contentType = String(config.headers.get('Content-Type'))
        }),
      }
    )

    expect(contentType).toBe('multipart/form-data')
  })
})
