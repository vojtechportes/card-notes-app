import { Module, type INestApplication } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SyncConflictService } from '../../../src/modules/sync/sync-conflict.service'
import { SyncController } from '../../../src/modules/sync/sync.controller'
import { SyncOrchestrationService } from '../../../src/modules/sync/sync-orchestration.service'
import { SyncPairingService } from '../../../src/modules/sync/sync-pairing.service'

@Module({
  controllers: [SyncController],
  providers: [
    { provide: SyncConflictService, useValue: {} },
    { provide: SyncOrchestrationService, useValue: {} },
    { provide: SyncPairingService, useValue: {} },
  ],
})
class SyncSwaggerTestModule {}

describe('synchronization API contract', () => {
  let app: INestApplication | undefined

  afterEach(async () => {
    await app?.close()
  })

  it('publishes stable status, trigger, command, and conflict Swagger schemas', async () => {
    app = await NestFactory.create(SyncSwaggerTestModule, { logger: false })
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('NoteStack API')
        .setVersion('0.1.0')
        .build()
    )

    expect(Object.keys(document.paths ?? {})).toEqual(
      expect.arrayContaining([
        '/sync/status',
        '/sync/run',
        '/sync/trigger',
        '/sync/commands',
        '/sync/providers',
        '/sync/pairing/prepare',
        '/sync/pairing/{id}',
        '/sync/pairing/{id}/confirm',
        '/sync/pairing/{id}/cancel',
        '/sync/conflicts',
        '/sync/conflicts/{id}',
        '/sync/conflicts/{id}/resolve',
      ])
    )
    expect(document.components?.schemas?.SyncStatusDto).toMatchObject({
      required: expect.arrayContaining([
        'state',
        'isEnabled',
        'pendingMutationCount',
        'unresolvedConflictCount',
        'isStartupReady',
        'dataRevision',
      ]),
      properties: {
        state: {
          enum: expect.arrayContaining([
            'disabled',
            'connecting',
            'syncing',
            'synced',
            'offline',
            'attention-required',
            'error',
          ]),
        },
      },
    })
    expect(document.components?.schemas?.SyncCommandDto).toMatchObject({
      properties: {
        command: {
          enum: [
            'enable',
            'disable',
            'disconnect',
            'switch-provider',
            'reset',
            'repair',
          ],
        },
      },
    })
  })

  it('validates trigger input and exposes safe command boundaries', async () => {
    const orchestration = {
      getStatus: vi.fn(() => ({ state: 'disabled' })),
      trigger: vi.fn(),
    }
    const pairing = {
      disable: vi.fn(),
      disconnect: vi.fn(),
      enable: vi.fn(),
      repair: vi.fn(),
      reset: vi.fn(),
      getProviderAvailability: vi.fn(() => [
        { provider: 'google-drive', available: true },
        {
          provider: 'one-drive',
          available: false,
          unavailableReasonCode: 'adapter-not-installed',
        },
      ]),
    }
    const controller = new SyncController(
      orchestration as never,
      pairing as never,
      {} as SyncConflictService
    )

    expect(controller.getProviderAvailability()).toEqual([
      { provider: 'google-drive', available: true },
      {
        provider: 'one-drive',
        available: false,
        unavailableReasonCode: 'adapter-not-installed',
      },
    ])
    expect(() =>
      controller.submitTrigger({ trigger: 'invalid' as never })
    ).toThrow('Synchronization trigger is not supported.')
    orchestration.trigger.mockResolvedValue({ state: 'syncing' })
    await expect(controller.runCommand({ command: 'enable' })).resolves.toEqual(
      { state: 'syncing' }
    )
    expect(pairing.enable).toHaveBeenCalledTimes(1)
    await expect(
      controller.runCommand({ command: 'disable' })
    ).resolves.toEqual({ state: 'disabled' })
    expect(pairing.disable).toHaveBeenCalledTimes(1)
    await expect(
      controller.runCommand({ command: 'disconnect', confirmed: true })
    ).resolves.toEqual({ state: 'disabled' })
    expect(pairing.disconnect).toHaveBeenCalledTimes(1)
    expect(() => controller.runCommand({ command: 'reset' })).toThrow(
      'require explicit confirmation'
    )
    expect(() => controller.runCommand({ command: 'repair' })).toThrow(
      'require explicit confirmation'
    )
    expect(() => controller.runCommand({ command: 'switch-provider' })).toThrow(
      'pairing prepare endpoint'
    )
  })

  it('lists, reads, resolves, and rejects missing conflicts', () => {
    const conflict = { id: 'conflict-1' }
    const orchestration = {
      trigger: vi.fn(),
    }
    const conflicts = {
      findById: vi.fn((id: string) => (id === conflict.id ? conflict : null)),
      listUnresolved: vi.fn(() => [conflict]),
      resolve: vi.fn(() => ({
        ...conflict,
        resolutionState: 'resolved-local',
      })),
    }
    const controller = new SyncController(
      orchestration as never,
      {} as SyncPairingService,
      conflicts as never
    )

    expect(controller.listConflicts()).toEqual([conflict])
    expect(controller.getConflict(conflict.id)).toBe(conflict)
    expect(() => controller.getConflict('missing')).toThrow(
      'Synchronization conflict missing was not found.'
    )
    expect(
      controller.resolveConflict(conflict.id, {
        resolutionState: 'resolved-local',
      })
    ).toMatchObject({
      id: conflict.id,
      resolutionState: 'resolved-local',
    })
    expect(orchestration.trigger).toHaveBeenCalledWith('conflict-resolution')
    controller.resolveConflict(conflict.id, {
      resolutionState: 'resolved-merged',
      retainBoth: true,
    })
    expect(conflicts.resolve).toHaveBeenLastCalledWith({
      conflictId: conflict.id,
      resolutionState: 'resolved-merged',
      mergedDocument: undefined,
      retainBoth: true,
    })
    expect(() =>
      controller.resolveConflict(conflict.id, {
        resolutionState: 'resolved-local',
        retainBoth: true,
      })
    ).toThrow('requires merged conflict resolution')
    expect(() =>
      controller.resolveConflict('missing', {
        resolutionState: 'resolved-local',
      })
    ).toThrow('Synchronization conflict missing was not found.')
  })
})
