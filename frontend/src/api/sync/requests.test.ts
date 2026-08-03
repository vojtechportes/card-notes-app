import type { AxiosResponse } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  ResolveSyncConflictDto,
  SyncCommandDto,
  SyncConflictDto,
  SyncStatusDto,
  SyncTriggerDto,
} from '../../types/api'
import {
  getSyncConflict,
  getSyncStatus,
  listSyncConflicts,
  resolveSyncConflict,
  runSyncCommand,
  runSyncNow,
  submitSyncTrigger,
} from './requests'

const apiClientMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('../../utils/api-client', () => ({ apiClient: apiClientMock }))

const createResponse = <TData>(data: TData): AxiosResponse<TData> => ({
  config: {} as AxiosResponse<TData>['config'],
  data,
  headers: {},
  status: 200,
  statusText: 'OK',
})

const status = {} as SyncStatusDto
const conflict = {} as SyncConflictDto

describe('synchronization requests', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns direct Axios promises for status and conflict reads', () => {
    const signal = new AbortController().signal
    const statusResponse = Promise.resolve(createResponse(status))
    const conflictsResponse = Promise.resolve(createResponse([conflict]))
    const conflictResponse = Promise.resolve(createResponse(conflict))
    apiClientMock.get
      .mockReturnValueOnce(statusResponse)
      .mockReturnValueOnce(conflictsResponse)
      .mockReturnValueOnce(conflictResponse)

    expect(getSyncStatus(signal)).toBe(statusResponse)
    expect(listSyncConflicts(signal)).toBe(conflictsResponse)
    expect(getSyncConflict('conflict-1', signal)).toBe(conflictResponse)
    expect(apiClientMock.get).toHaveBeenNthCalledWith(1, '/sync/status', {
      signal,
    })
    expect(apiClientMock.get).toHaveBeenNthCalledWith(2, '/sync/conflicts', {
      signal,
    })
    expect(apiClientMock.get).toHaveBeenNthCalledWith(
      3,
      '/sync/conflicts/conflict-1',
      { signal }
    )
  })

  it('returns direct Axios promises for run, trigger, and command operations', () => {
    const trigger: SyncTriggerDto = { trigger: 'focus' }
    const command: SyncCommandDto = { command: 'disconnect' }
    const runResponse = Promise.resolve(createResponse(status))
    const triggerResponse = Promise.resolve(createResponse(status))
    const commandResponse = Promise.resolve(createResponse(status))
    apiClientMock.post
      .mockReturnValueOnce(runResponse)
      .mockReturnValueOnce(triggerResponse)
      .mockReturnValueOnce(commandResponse)

    expect(runSyncNow()).toBe(runResponse)
    expect(submitSyncTrigger(trigger)).toBe(triggerResponse)
    expect(runSyncCommand(command)).toBe(commandResponse)
    expect(apiClientMock.post).toHaveBeenNthCalledWith(1, '/sync/run')
    expect(apiClientMock.post).toHaveBeenNthCalledWith(
      2,
      '/sync/trigger',
      trigger
    )
    expect(apiClientMock.post).toHaveBeenNthCalledWith(
      3,
      '/sync/commands',
      command
    )
  })

  it('returns the direct Axios promise for conflict resolution', () => {
    const resolution: ResolveSyncConflictDto = {
      resolutionState: 'resolved-local',
    }
    const response = Promise.resolve(createResponse(conflict))
    apiClientMock.post.mockReturnValue(response)

    expect(resolveSyncConflict('conflict-1', resolution)).toBe(response)
    expect(apiClientMock.post).toHaveBeenCalledWith(
      '/sync/conflicts/conflict-1/resolve',
      resolution
    )
  })
})
