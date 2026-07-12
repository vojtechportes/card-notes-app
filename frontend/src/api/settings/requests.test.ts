import type { AxiosResponse } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  ColumnDto,
  CreateColumnDto,
  CreateNoteTypeDto,
  DeleteColumnQueryDto,
  DeleteNoteTypeDto,
  DeleteNoteTypeResultDto,
  GeneralSettingsDto,
  NoteTypeDetailDto,
  NoteTypeDto,
  ReorderColumnsDto,
  UpdateColumnDto,
  UpdateGeneralSettingsDto,
  UpdateNoteTypeDto,
} from '../../types/api'
import {
  createColumn,
  createNoteType,
  deleteColumn,
  deleteNoteType,
  getColumns,
  getGeneralSettings,
  getNoteType,
  getNoteTypes,
  reorderColumns,
  updateColumn,
  updateGeneralSettings,
  updateNoteType,
} from './requests'

const apiClientMock = vi.hoisted(() => ({
  delete: vi.fn(),
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
}))

vi.mock('../../utils/api-client', () => ({
  apiClient: apiClientMock,
}))

const createResponse = <TData>(data: TData): AxiosResponse<TData> => {
  return {
    config: {} as AxiosResponse<TData>['config'],
    data,
    headers: {},
    status: 200,
    statusText: 'OK',
  }
}

const noteTypeId = 'note-type-1'

const createColumnDto = (): ColumnDto => ({
  config: null,
  createdAt: '2026-07-08T10:00:00.000Z',
  id: 'column-1',
  isDefault: false,
  isHidden: false,
  name: 'summary',
  noteTypeId,
  sortOrder: 2,
  title: 'Summary',
  type: 'text',
  updatedAt: '2026-07-08T10:00:00.000Z',
})

const createNoteTypeDto = (): NoteTypeDto => ({
  createdAt: '2026-07-08T10:00:00.000Z',
  id: noteTypeId,
  title: 'Default',
  updatedAt: '2026-07-08T10:00:00.000Z',
})

describe('settings requests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches configured note types', () => {
    const signal = new AbortController().signal
    const response = Promise.resolve(createResponse<NoteTypeDto[]>([]))
    apiClientMock.get.mockReturnValue(response)

    const result = getNoteTypes(signal)

    expect(result).toBe(response)
    expect(apiClientMock.get).toHaveBeenCalledWith('/settings/note-types', {
      signal,
    })
  })

  it('fetches note type detail', () => {
    const signal = new AbortController().signal
    const response = Promise.resolve(
      createResponse<NoteTypeDetailDto>({
        ...createNoteTypeDto(),
        columns: [createColumnDto()],
      })
    )
    apiClientMock.get.mockReturnValue(response)

    const result = getNoteType(noteTypeId, signal)

    expect(result).toBe(response)
    expect(apiClientMock.get).toHaveBeenCalledWith(
      `/settings/note-types/${noteTypeId}`,
      {
        signal,
      }
    )
  })

  it('creates a note type', () => {
    const noteType: CreateNoteTypeDto = {
      title: 'Projects',
    }
    const response = Promise.resolve(createResponse<NoteTypeDto>(createNoteTypeDto()))
    apiClientMock.post.mockReturnValue(response)

    const result = createNoteType(noteType)

    expect(result).toBe(response)
    expect(apiClientMock.post).toHaveBeenCalledWith('/settings/note-types', noteType)
  })

  it('updates a note type', () => {
    const noteType: UpdateNoteTypeDto = {
      title: 'Projects',
    }
    const response = Promise.resolve(createResponse<NoteTypeDto>(createNoteTypeDto()))
    apiClientMock.patch.mockReturnValue(response)

    const result = updateNoteType(noteTypeId, noteType)

    expect(result).toBe(response)
    expect(apiClientMock.patch).toHaveBeenCalledWith(
      `/settings/note-types/${noteTypeId}`,
      noteType
    )
  })

  it('deletes a note type with body data', () => {
    const noteType: DeleteNoteTypeDto = {
      mode: 'delete-notes',
    }
    const response = Promise.resolve(
      createResponse<DeleteNoteTypeResultDto>({
        deletedNoteTypeId: noteTypeId,
        deletedNotesCount: 4,
        movedNotesCount: 0,
      })
    )
    apiClientMock.delete.mockReturnValue(response)

    const result = deleteNoteType(noteTypeId, noteType)

    expect(result).toBe(response)
    expect(apiClientMock.delete).toHaveBeenCalledWith(
      `/settings/note-types/${noteTypeId}`,
      {
        data: noteType,
      }
    )
  })

  it('fetches configured note columns', () => {
    const signal = new AbortController().signal
    const response = Promise.resolve(createResponse<ColumnDto[]>([]))
    apiClientMock.get.mockReturnValue(response)

    const result = getColumns(noteTypeId, signal)

    expect(result).toBe(response)
    expect(apiClientMock.get).toHaveBeenCalledWith(
      `/settings/note-types/${noteTypeId}/columns`,
      {
        signal,
      }
    )
  })

  it('creates a note column', () => {
    const column: CreateColumnDto = {
      name: 'summary',
      title: 'Summary',
      type: 'text',
    }
    const response = Promise.resolve(createResponse<ColumnDto>(createColumnDto()))
    apiClientMock.post.mockReturnValue(response)

    const result = createColumn(noteTypeId, column)

    expect(result).toBe(response)
    expect(apiClientMock.post).toHaveBeenCalledWith(
      `/settings/note-types/${noteTypeId}/columns`,
      column
    )
  })

  it('reorders note columns', () => {
    const columnOrder: ReorderColumnsDto = {
      columnIds: ['column-1', 'column-2'],
    }
    const response = Promise.resolve(createResponse<ColumnDto[]>([]))
    apiClientMock.patch.mockReturnValue(response)

    const result = reorderColumns(noteTypeId, columnOrder)

    expect(result).toBe(response)
    expect(apiClientMock.patch).toHaveBeenCalledWith(
      `/settings/note-types/${noteTypeId}/columns/order`,
      columnOrder
    )
  })

  it('updates a note column', () => {
    const column: UpdateColumnDto = {
      isHidden: true,
      title: 'Updated summary',
    }
    const response = Promise.resolve(
      createResponse<ColumnDto>({
        ...createColumnDto(),
        isHidden: true,
        title: 'Updated summary',
        updatedAt: '2026-07-08T10:15:00.000Z',
      })
    )
    apiClientMock.patch.mockReturnValue(response)

    const result = updateColumn(noteTypeId, 'column-1', column)

    expect(result).toBe(response)
    expect(apiClientMock.patch).toHaveBeenCalledWith(
      `/settings/note-types/${noteTypeId}/columns/column-1`,
      column
    )
  })

  it('deletes a note column with delete mode params', () => {
    const query: DeleteColumnQueryDto = {
      deleteMode: 'definitionAndValues',
    }
    const response = Promise.resolve(createResponse<void>(undefined))
    apiClientMock.delete.mockReturnValue(response)

    const result = deleteColumn(noteTypeId, 'column-1', query)

    expect(result).toBe(response)
    expect(apiClientMock.delete).toHaveBeenCalledWith(
      `/settings/note-types/${noteTypeId}/columns/column-1`,
      {
        params: query,
      }
    )
  })

  it('fetches general note card settings', () => {
    const signal = new AbortController().signal
    const response = Promise.resolve(
      createResponse<GeneralSettingsDto>({
        cardFieldDisplayCount: null,
        textTruncationLength: null,
        mergeDateTimeFields: null,
      })
    )
    apiClientMock.get.mockReturnValue(response)

    const result = getGeneralSettings(signal)

    expect(result).toBe(response)
    expect(apiClientMock.get).toHaveBeenCalledWith('/settings/general', {
      signal,
    })
  })

  it('updates general note card settings', () => {
    const settings: UpdateGeneralSettingsDto = {
      cardFieldDisplayCount: 4,
      textTruncationLength: 120,
    }
    const response = Promise.resolve(
      createResponse<GeneralSettingsDto>({
        cardFieldDisplayCount: 4,
        textTruncationLength: 120,
        mergeDateTimeFields: false,
      })
    )
    apiClientMock.patch.mockReturnValue(response)

    const result = updateGeneralSettings(settings)

    expect(result).toBe(response)
    expect(apiClientMock.patch).toHaveBeenCalledWith(
      '/settings/general',
      settings
    )
  })
})
