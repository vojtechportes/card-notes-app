import { Logger } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RuntimeDiagnosticsService } from '../../../src/modules/runtime-diagnostics/runtime-diagnostics.service'
import { SyncErrorClassificationEnum } from '../../../src/modules/sync/types/sync-error-classification-enum'
import { SyncProviderEnum } from '../../../src/modules/sync/types/sync-provider-enum'
import { SyncTriggerEnum } from '../../../src/modules/sync/types/sync-trigger-enum'

const parseDiagnostic = (output: unknown): Record<string, unknown> => {
  const marker = '[runtime-diagnostic] '
  const value = String(output)

  expect(value.startsWith(marker)).toBe(true)

  return JSON.parse(value.slice(marker.length)) as Record<string, unknown>
}

describe(RuntimeDiagnosticsService.name, () => {
  let errorOutput: ReturnType<typeof vi.spyOn>
  let service: RuntimeDiagnosticsService
  let providerError: Error

  beforeEach(() => {
    errorOutput = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined)
    service = new RuntimeDiagnosticsService()
    providerError = new Error(
      'access_token=secret-token user@example.com code=secret-code'
    )
    providerError.name = 'SyncProviderError'
    providerError.stack = [
      'SyncProviderError: access_token=secret-token user@example.com',
      '    at getIdentity (C:\\Users\\person\\app\\backend\\src\\modules\\sync\\google-drive\\google-drive-sync-provider.adapter.ts:42:7)',
      '    at request (C:\\Users\\person\\app\\node_modules\\axios\\index.js:10:3)',
    ].join('\n')
  })

  it('writes a sanitized API failure without raw exception data', () => {
    service.recordApiFailure({
      error: providerError,
      method: 'POST',
      route: '/api/sync/pairing/prepare',
      status: 500,
    })

    expect(errorOutput).toHaveBeenCalledTimes(1)
    const rawOutput = String(errorOutput.mock.calls[0][0])
    const diagnostic = parseDiagnostic(rawOutput)

    expect(diagnostic).toEqual({
      errorKind: 'sync-provider-error',
      frames: [
        'modules/sync/google-drive/google-drive-sync-provider.adapter.ts:42:7',
      ],
      method: 'POST',
      route: '/api/sync/pairing/prepare',
      status: 500,
      type: 'api-failure',
    })
    expect(rawOutput).not.toContain('secret-token')
    expect(rawOutput).not.toContain('secret-code')
    expect(rawOutput).not.toContain('user@example.com')
    expect(rawOutput).not.toContain('C:\\Users')
    expect(rawOutput).not.toContain('axios')
  })

  it('writes closed synchronization and pairing diagnostics', () => {
    service.recordSyncFailure({
      classification: SyncErrorClassificationEnum.AuthenticationRequired,
      error: providerError,
      provider: SyncProviderEnum.GoogleDrive,
      trigger: SyncTriggerEnum.Manual,
    })
    service.recordPairingFailure({
      error: providerError,
      errorCode: 'pairing-failed',
      operation: 'confirm',
      provider: SyncProviderEnum.GoogleDrive,
    })

    expect(parseDiagnostic(errorOutput.mock.calls[0][0])).toMatchObject({
      classification: 'authentication-required',
      provider: 'google-drive',
      trigger: 'manual',
      type: 'sync-failure',
    })
    expect(parseDiagnostic(errorOutput.mock.calls[1][0])).toMatchObject({
      errorCode: 'pairing-failed',
      operation: 'confirm',
      provider: 'google-drive',
      type: 'pairing-failure',
    })
  })

  it('maps hostile metadata values to closed fallbacks', () => {
    service.recordApiFailure({
      error: providerError,
      method: 'secret-method',
      route: '/api/sync?account=user@example.com',
      status: 200,
    })
    service.recordSyncFailure({
      classification: 'account-user@example.com',
      error: providerError,
      provider: 'provider-private-id',
      trigger: 'trigger-secret-code',
    })
    service.recordPairingFailure({
      error: providerError,
      errorCode: 'account-private-id',
      operation: 'operation-private-id',
      provider: 'provider-private-id',
    })

    expect(parseDiagnostic(errorOutput.mock.calls[0][0])).toMatchObject({
      method: 'UNKNOWN',
      route: 'unavailable',
      status: 500,
    })
    expect(parseDiagnostic(errorOutput.mock.calls[1][0])).toMatchObject({
      classification: 'unknown',
      provider: 'unknown',
      trigger: 'unknown',
    })
    expect(parseDiagnostic(errorOutput.mock.calls[2][0])).toMatchObject({
      errorCode: 'unknown',
      operation: 'unknown',
      provider: 'unknown',
    })
    expect(errorOutput.mock.calls.flat().join(' ')).not.toContain(
      'user@example.com'
    )
    expect(errorOutput.mock.calls.flat().join(' ')).not.toContain('private-id')
    expect(errorOutput.mock.calls.flat().join(' ')).not.toContain('secret-code')
  })
})
