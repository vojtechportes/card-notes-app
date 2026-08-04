import { afterEach, describe, expect, it, vi } from 'vitest'
import { RequestBodyService } from '../src/services/request-body.service'
import { StructuredLoggerService } from '../src/services/structured-logger.service'

describe('request and logging abuse boundaries', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects non-object and oversized JSON bodies', async () => {
    const bodyService = new RequestBodyService()

    await expect(
      bodyService.readJson(
        new Request('https://relay.test', { method: 'POST', body: '[]' })
      )
    ).rejects.toMatchObject({ code: 'invalid_json_object' })
    await expect(
      bodyService.readJson(
        new Request('https://relay.test', {
          method: 'POST',
          body: JSON.stringify({ value: 'x'.repeat(9_000) }),
        })
      )
    ).rejects.toMatchObject({ code: 'request_too_large' })
  })

  it('logs only allowlisted operational fields', () => {
    const consoleSpy = vi
      .spyOn(console, 'log')
      .mockImplementation(() => undefined)
    const logger = new StructuredLoggerService()

    logger.write({
      event: 'relay_request',
      outcome: 'rejected',
      code: '401',
      secret: 'must-not-be-logged',
      noteTitle: 'must-not-be-logged',
    } as Parameters<StructuredLoggerService['write']>[0])

    expect(consoleSpy).toHaveBeenCalledOnce()
    expect(consoleSpy.mock.calls[0][0]).not.toContain('must-not-be-logged')
  })
})
