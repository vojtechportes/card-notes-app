import type { AxiosResponse } from 'axios'
import type {
  ConfirmSyncPairingDto,
  PrepareSyncPairingDto,
  ResolveSyncConflictDto,
  SyncCommandDto,
  SyncConflictDto,
  SyncPairingOperationDto,
  SyncProviderAvailabilityDto,
  SyncStatusDto,
  SyncTriggerDto,
} from '../../types/api'
import { apiClient } from '../../utils/api-client'

export const getSyncStatus = (
  signal?: AbortSignal
): Promise<AxiosResponse<SyncStatusDto>> => {
  return apiClient.get<SyncStatusDto>('/sync/status', { signal })
}

export const runSyncNow = (): Promise<AxiosResponse<SyncStatusDto>> => {
  return apiClient.post<SyncStatusDto>('/sync/run')
}

export const submitSyncTrigger = (
  trigger: SyncTriggerDto
): Promise<AxiosResponse<SyncStatusDto>> => {
  return apiClient.post<SyncStatusDto>('/sync/trigger', trigger)
}

export const runSyncCommand = (
  command: SyncCommandDto
): Promise<AxiosResponse<SyncStatusDto>> => {
  return apiClient.post<SyncStatusDto>('/sync/commands', command)
}

export const listSyncConflicts = (
  signal?: AbortSignal
): Promise<AxiosResponse<SyncConflictDto[]>> => {
  return apiClient.get<SyncConflictDto[]>('/sync/conflicts', { signal })
}

export const getSyncConflict = (
  id: string,
  signal?: AbortSignal
): Promise<AxiosResponse<SyncConflictDto>> => {
  return apiClient.get<SyncConflictDto>(`/sync/conflicts/${id}`, { signal })
}

export const resolveSyncConflict = (
  id: string,
  resolution: ResolveSyncConflictDto
): Promise<AxiosResponse<SyncConflictDto>> => {
  return apiClient.post<SyncConflictDto>(
    `/sync/conflicts/${id}/resolve`,
    resolution
  )
}

export const getSyncProviderAvailability = (
  signal?: AbortSignal
): Promise<AxiosResponse<SyncProviderAvailabilityDto[]>> => {
  return apiClient.get<SyncProviderAvailabilityDto[]>('/sync/providers', {
    signal,
  })
}

export const prepareSyncPairing = (
  input: PrepareSyncPairingDto
): Promise<AxiosResponse<SyncPairingOperationDto>> => {
  return apiClient.post<SyncPairingOperationDto>('/sync/pairing/prepare', input)
}

export const getSyncPairing = (
  id: string,
  signal?: AbortSignal
): Promise<AxiosResponse<SyncPairingOperationDto>> => {
  return apiClient.get<SyncPairingOperationDto>(`/sync/pairing/${id}`, {
    signal,
  })
}

export const confirmSyncPairing = (
  id: string,
  input: ConfirmSyncPairingDto
): Promise<AxiosResponse<SyncPairingOperationDto>> => {
  return apiClient.post<SyncPairingOperationDto>(
    `/sync/pairing/${id}/confirm`,
    input
  )
}

export const cancelSyncPairing = (
  id: string
): Promise<AxiosResponse<SyncPairingOperationDto>> => {
  return apiClient.post<SyncPairingOperationDto>(`/sync/pairing/${id}/cancel`)
}
