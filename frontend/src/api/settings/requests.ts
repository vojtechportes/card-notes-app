import type { AxiosResponse } from 'axios'
import type {
  ColumnDto,
  CreateColumnDto,
  CreateLabelDto,
  CreateNoteTypeDto,
  DeleteColumnQueryDto,
  DeleteLabelResultDto,
  DeleteNoteTypeDto,
  DeleteNoteTypeResultDto,
  GeneralSettingsDto,
  LabelDto,
  NoteTypeDetailDto,
  NoteTypeDto,
  ReorderColumnsDto,
  UpdateColumnDto,
  UpdateLabelDto,
  UpdateGeneralSettingsDto,
  UpdateNoteTypeDto,
} from '../../types/api'
import { apiClient } from '../../utils/api-client'

export const getLabels = (
  signal?: AbortSignal
): Promise<AxiosResponse<LabelDto[]>> => {
  return apiClient.get<LabelDto[]>('/settings/labels', {
    signal,
  })
}

export const createLabel = (
  label: CreateLabelDto
): Promise<AxiosResponse<LabelDto>> => {
  return apiClient.post<LabelDto>('/settings/labels', label)
}

export const updateLabel = (
  id: string,
  label: UpdateLabelDto
): Promise<AxiosResponse<LabelDto>> => {
  return apiClient.patch<LabelDto>(`/settings/labels/${id}`, label)
}

export const deleteLabel = (
  id: string
): Promise<AxiosResponse<DeleteLabelResultDto>> => {
  return apiClient.delete<DeleteLabelResultDto>(`/settings/labels/${id}`)
}
export const getNoteTypes = (
  signal?: AbortSignal
): Promise<AxiosResponse<NoteTypeDto[]>> => {
  return apiClient.get<NoteTypeDto[]>('/settings/note-types', {
    signal,
  })
}

export const getNoteType = (
  id: string,
  signal?: AbortSignal
): Promise<AxiosResponse<NoteTypeDetailDto>> => {
  return apiClient.get<NoteTypeDetailDto>(`/settings/note-types/${id}`, {
    signal,
  })
}

export const createNoteType = (
  noteType: CreateNoteTypeDto
): Promise<AxiosResponse<NoteTypeDto>> => {
  return apiClient.post<NoteTypeDto>('/settings/note-types', noteType)
}

export const updateNoteType = (
  id: string,
  noteType: UpdateNoteTypeDto
): Promise<AxiosResponse<NoteTypeDto>> => {
  return apiClient.patch<NoteTypeDto>(`/settings/note-types/${id}`, noteType)
}

export const deleteNoteType = (
  id: string,
  noteType: DeleteNoteTypeDto
): Promise<AxiosResponse<DeleteNoteTypeResultDto>> => {
  return apiClient.delete<DeleteNoteTypeResultDto>(
    `/settings/note-types/${id}`,
    {
      data: noteType,
    }
  )
}

export const getColumns = (
  noteTypeId: string,
  signal?: AbortSignal
): Promise<AxiosResponse<ColumnDto[]>> => {
  return apiClient.get<ColumnDto[]>(
    `/settings/note-types/${noteTypeId}/columns`,
    {
      signal,
    }
  )
}

export const createColumn = (
  noteTypeId: string,
  column: CreateColumnDto
): Promise<AxiosResponse<ColumnDto>> => {
  return apiClient.post<ColumnDto>(
    `/settings/note-types/${noteTypeId}/columns`,
    column
  )
}

export const reorderColumns = (
  noteTypeId: string,
  columnOrder: ReorderColumnsDto
): Promise<AxiosResponse<ColumnDto[]>> => {
  return apiClient.patch<ColumnDto[]>(
    `/settings/note-types/${noteTypeId}/columns/order`,
    columnOrder
  )
}

export const updateColumn = (
  noteTypeId: string,
  id: string,
  column: UpdateColumnDto
): Promise<AxiosResponse<ColumnDto>> => {
  return apiClient.patch<ColumnDto>(
    `/settings/note-types/${noteTypeId}/columns/${id}`,
    column
  )
}

export const deleteColumn = (
  noteTypeId: string,
  id: string,
  query?: DeleteColumnQueryDto
): Promise<AxiosResponse<void>> => {
  return apiClient.delete<void>(
    `/settings/note-types/${noteTypeId}/columns/${id}`,
    {
      params: query,
    }
  )
}

export const getGeneralSettings = (
  signal?: AbortSignal
): Promise<AxiosResponse<GeneralSettingsDto>> => {
  return apiClient.get<GeneralSettingsDto>('/settings/general', {
    signal,
  })
}

export const updateGeneralSettings = (
  settings: UpdateGeneralSettingsDto
): Promise<AxiosResponse<GeneralSettingsDto>> => {
  return apiClient.patch<GeneralSettingsDto>('/settings/general', settings)
}
