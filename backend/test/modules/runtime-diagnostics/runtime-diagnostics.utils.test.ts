import { describe, expect, it } from 'vitest'
import { getSanitizedErrorFrames } from '../../../src/modules/runtime-diagnostics/utils/get-sanitized-error-frames.util'
import { getSanitizedRouteTemplate } from '../../../src/modules/runtime-diagnostics/utils/get-sanitized-route-template.util'

describe('runtime diagnostic sanitizers', () => {
  it('keeps only bounded backend-relative stack frames', () => {
    const error = new Error('private provider response')
    error.stack = [
      'Error: private provider response',
      '    at first (C:\\private\\backend\\dist\\modules\\sync\\first.js:10:2)',
      '    at dependency (C:\\private\\node_modules\\package\\dist\\index.js:4:1)',
      '    at second (/opt/app/backend/src/modules/sync/second.ts:20:5)',
    ].join('\n')

    expect(getSanitizedErrorFrames(error)).toEqual([
      'modules/sync/first.js:10:2',
      'modules/sync/second.ts:20:5',
    ])
  })

  it('fails closed for raw, oversized, and unsafe route values', () => {
    expect(
      getSanitizedRouteTemplate({
        baseUrl: '/api/sync',
        route: { path: '/pairing/:id' },
      })
    ).toBe('/api/sync/pairing/:id')
    expect(
      getSanitizedRouteTemplate({
        baseUrl: '/api/sync',
        route: { path: '/pairing/private-id?code=secret' },
      })
    ).toBe('unavailable')
    expect(
      getSanitizedRouteTemplate({
        baseUrl: '/api',
        route: { path: '/' + 'a'.repeat(200) },
      })
    ).toBe('unavailable')
  })
})
