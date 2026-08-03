import { Module, type INestApplication } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SyncConflictService } from '../../../src/modules/sync/sync-conflict.service'
import { SyncController } from '../../../src/modules/sync/sync.controller'
import { SyncOrchestrationService } from '../../../src/modules/sync/sync-orchestration.service'

@Module({
  controllers: [SyncController],
  providers: [
    { provide: SyncConflictService, useValue: {} },
    { provide: SyncOrchestrationService, useValue: {} },
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
          enum: ['disconnect', 'switch-provider', 'reset', 'repair'],
        },
      },
    })
  })

  it('validates trigger input and exposes safe command boundaries', async () => {
    const orchestration = {
      requestDisconnect: vi.fn(() => {
        throw new Error('disconnect boundary')
      }),
      repair: vi.fn(),
      requestProviderSwitch: vi.fn(() => {
        throw new Error('switch boundary')
      }),
      requestReset: vi.fn(() => {
        throw new Error('reset boundary')
      }),
      trigger: vi.fn(),
    }
    const controller = new SyncController(
      orchestration as never,
      {} as SyncConflictService
    )

    expect(() =>
      controller.submitTrigger({ trigger: 'invalid' as never })
    ).toThrow('Synchronization trigger is not supported.')
    expect(() => controller.runCommand({ command: 'disconnect' })).toThrow(
      'disconnect boundary'
    )
    expect(orchestration.requestDisconnect).toHaveBeenCalledTimes(1)
    expect(() => controller.runCommand({ command: 'switch-provider' })).toThrow(
      'switch boundary'
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
    expect(() =>
      controller.resolveConflict('missing', {
        resolutionState: 'resolved-local',
      })
    ).toThrow('Synchronization conflict missing was not found.')
  })
})
