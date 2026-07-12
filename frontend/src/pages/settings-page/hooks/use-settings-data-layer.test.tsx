import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { AxiosResponse } from 'axios'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  ColumnDto,
  CreateColumnDto,
  CreateNoteTypeDto,
  DeleteAllNotesResultDto,
  DeleteNoteTypeDto,
  DeleteNoteTypeResultDto,
  ExportImportDataDto,
  GeneralSettingsDto,
  ImportResultDto,
  NoteTypeDetailDto,
  NoteTypeDto,
  ReorderColumnsDto,
  UpdateColumnDto,
  UpdateGeneralSettingsDto,
  UpdateNoteTypeDto,
} from '../../../types/api'
import { deleteAllNotes } from '../../../api/notes/requests'
import { getExportData, importData } from '../../../api/export-import/requests'
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
} from '../../../api/settings/requests'
import { notesQueryKeys } from '../../notes-page/constants/notes-query-keys'
import { settingsQueryKeys } from '../constants/settings-query-keys'
import { useCreateColumnMutation } from './use-create-column-mutation'
import { useCreateNoteTypeMutation } from './use-create-note-type-mutation'
import { useDeleteAllNotesMutation } from './use-delete-all-notes-mutation'
import { useDeleteColumnMutation } from './use-delete-column-mutation'
import { useDeleteNoteTypeMutation } from './use-delete-note-type-mutation'
import { useExportDataMutation } from './use-export-data-mutation'
import { useGeneralSettingsQuery } from './use-general-settings-query'
import { useImportDataMutation } from './use-import-data-mutation'
import { useNoteColumnsQuery } from './use-note-columns-query'
import { useNoteTypeDetailQuery } from './use-note-type-detail-query'
import { useNoteTypesQuery } from './use-note-types-query'
import { useReorderColumnsMutation } from './use-reorder-columns-mutation'
import { useUpdateColumnMutation } from './use-update-column-mutation'
import { useUpdateGeneralSettingsMutation } from './use-update-general-settings-mutation'
import { useUpdateNoteTypeMutation } from './use-update-note-type-mutation'

vi.mock('../../../api/settings/requests', () => ({
  createColumn: vi.fn(),
  createNoteType: vi.fn(),
  deleteColumn: vi.fn(),
  deleteNoteType: vi.fn(),
  getColumns: vi.fn(),
  getGeneralSettings: vi.fn(),
  getNoteType: vi.fn(),
  getNoteTypes: vi.fn(),
  reorderColumns: vi.fn(),
  updateColumn: vi.fn(),
  updateGeneralSettings: vi.fn(),
  updateNoteType: vi.fn(),
}))

vi.mock('../../../api/export-import/requests', () => ({
  getExportData: vi.fn(),
  importData: vi.fn(),
}))

vi.mock('../../../api/notes/requests', () => ({
  deleteAllNotes: vi.fn(),
}))

const createResponse = <TData,>(data: TData): AxiosResponse<TData> => {
  return {
    config: {} as AxiosResponse<TData>['config'],
    data,
    headers: {},
    status: 200,
    statusText: 'OK',
  }
}

const noteTypeId = 'note-type-1'

const createColumnDto = (id: string): ColumnDto => ({
  config: null,
  createdAt: '2026-07-08T10:00:00.000Z',
  id,
  isDefault: false,
  isHidden: false,
  name: `column-${id}`,
  noteTypeId,
  sortOrder: 2,
  title: `Column ${id}`,
  type: 'text',
  updatedAt: '2026-07-08T10:00:00.000Z',
})

const createNoteTypeDto = (id = noteTypeId): NoteTypeDto => ({
  createdAt: '2026-07-08T10:00:00.000Z',
  id,
  title: `Type ${id}`,
  updatedAt: '2026-07-08T10:00:00.000Z',
})

const createGeneralSettingsDto = (): GeneralSettingsDto => ({
  cardFieldDisplayCount: 3,
  textTruncationLength: 120,
  mergeDateTimeFields: false,
})

const createExportImportDataDto = (): ExportImportDataDto => ({
  columns: [],
  exportedAt: '2026-07-08T10:00:00.000Z',
  generalSettings: createGeneralSettingsDto(),
  notes: [],
  version: 1,
})

const createImportResultDto = (): ImportResultDto => ({
  importedColumns: 1,
  updatedGeneralSettings: true,
  importedNotes: 2,
})

const createDeleteAllNotesResultDto = (): DeleteAllNotesResultDto => ({
  deletedCount: 5,
})

const createDeleteNoteTypeResultDto = (): DeleteNoteTypeResultDto => ({
  deletedNoteTypeId: noteTypeId,
  deletedNotesCount: 4,
  movedNotesCount: 0,
})

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: 0 },
      queries: { retry: 0 },
    },
  })
}

const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('settings query keys', () => {
  it('keeps note type, column, and general settings keys distinct', () => {
    expect(settingsQueryKeys.columns('note-type-1')).not.toEqual(
      settingsQueryKeys.general()
    )
    expect(settingsQueryKeys.noteTypes()).not.toEqual(
      settingsQueryKeys.columns('note-type-1')
    )
    expect(settingsQueryKeys.columns('note-type-1')).not.toEqual(
      settingsQueryKeys.columns('note-type-2')
    )
  })
})

describe('settings queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches note types and maps Axios response data', async () => {
    const noteTypes = [createNoteTypeDto()]
    vi.mocked(getNoteTypes).mockResolvedValue(createResponse(noteTypes))
    const queryClient = createTestQueryClient()

    const { result } = renderHook(() => useNoteTypesQuery(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.data).toEqual(noteTypes))
    expect(getNoteTypes).toHaveBeenCalledWith(expect.any(AbortSignal))
  })

  it('fetches note type detail and maps Axios response data', async () => {
    const noteTypeDetail: NoteTypeDetailDto = {
      ...createNoteTypeDto(),
      columns: [createColumnDto('column-1')],
    }
    vi.mocked(getNoteType).mockResolvedValue(createResponse(noteTypeDetail))
    const queryClient = createTestQueryClient()

    const { result } = renderHook(
      () => useNoteTypeDetailQuery(noteTypeId),
      {
        wrapper: createWrapper(queryClient),
      }
    )

    await waitFor(() => expect(result.current.data).toEqual(noteTypeDetail))
    expect(getNoteType).toHaveBeenCalledWith(noteTypeId, expect.any(AbortSignal))
  })

  it('fetches note columns and maps Axios response data', async () => {
    const columns = [createColumnDto('column-1')]
    vi.mocked(getColumns).mockResolvedValue(createResponse(columns))
    const queryClient = createTestQueryClient()

    const { result } = renderHook(() => useNoteColumnsQuery(noteTypeId), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.data).toEqual(columns))
    expect(getColumns).toHaveBeenCalledWith(noteTypeId, expect.any(AbortSignal))
  })

  it('fetches general settings and maps Axios response data', async () => {
    const settings = createGeneralSettingsDto()
    vi.mocked(getGeneralSettings).mockResolvedValue(createResponse(settings))
    const queryClient = createTestQueryClient()

    const { result } = renderHook(() => useGeneralSettingsQuery(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.data).toEqual(settings))
    expect(getGeneralSettings).toHaveBeenCalledWith(expect.any(AbortSignal))
  })
})

describe('settings mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates note types and invalidates the note types query', async () => {
    const payload: CreateNoteTypeDto = {
      title: 'Projects',
    }
    const createdNoteType = createNoteTypeDto()
    vi.mocked(createNoteType).mockResolvedValue(createResponse(createdNoteType))
    const queryClient = createTestQueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateNoteTypeMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await expect(result.current.mutateAsync(payload)).resolves.toEqual(
        createdNoteType
      )
    })

    expect(createNoteType).toHaveBeenCalledWith(payload)
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: settingsQueryKeys.noteTypes(),
    })
  })

  it('updates note types and invalidates note type list and detail queries', async () => {
    const payload: UpdateNoteTypeDto = {
      title: 'Projects',
    }
    const updatedNoteType = createNoteTypeDto()
    vi.mocked(updateNoteType).mockResolvedValue(createResponse(updatedNoteType))
    const queryClient = createTestQueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateNoteTypeMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await expect(
        result.current.mutateAsync({ id: noteTypeId, noteType: payload })
      ).resolves.toEqual(updatedNoteType)
    })

    expect(updateNoteType).toHaveBeenCalledWith(noteTypeId, payload)
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: settingsQueryKeys.noteTypes(),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: settingsQueryKeys.noteTypeDetail(noteTypeId),
    })
  })

  it('deletes note types and invalidates note type and notes queries', async () => {
    const payload: DeleteNoteTypeDto = {
      mode: 'delete-notes',
    }
    const deleteResult = createDeleteNoteTypeResultDto()
    vi.mocked(deleteNoteType).mockResolvedValue(createResponse(deleteResult))
    const queryClient = createTestQueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteNoteTypeMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await expect(
        result.current.mutateAsync({ id: noteTypeId, noteType: payload })
      ).resolves.toEqual(deleteResult)
    })

    expect(deleteNoteType).toHaveBeenCalledWith(noteTypeId, payload)
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: settingsQueryKeys.noteTypes(),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: settingsQueryKeys.noteTypeDetail(noteTypeId),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: settingsQueryKeys.columns(noteTypeId),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: notesQueryKeys.lists(),
    })
  })

  it('creates columns and invalidates the scoped columns query', async () => {
    const payload: CreateColumnDto = {
      name: 'summary',
      title: 'Summary',
      type: 'text',
    }
    const createdColumn = createColumnDto('column-1')
    vi.mocked(createColumn).mockResolvedValue(createResponse(createdColumn))
    const queryClient = createTestQueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateColumnMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await expect(
        result.current.mutateAsync({ column: payload, noteTypeId })
      ).resolves.toEqual(createdColumn)
    })

    expect(createColumn).toHaveBeenCalledWith(noteTypeId, payload)
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: settingsQueryKeys.columns(noteTypeId),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: settingsQueryKeys.noteTypeDetail(noteTypeId),
    })
  })

  it('updates columns and invalidates the scoped columns query', async () => {
    const payload: UpdateColumnDto = {
      title: 'Renamed summary',
    }
    const updatedColumn = createColumnDto('column-1')
    vi.mocked(updateColumn).mockResolvedValue(createResponse(updatedColumn))
    const queryClient = createTestQueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateColumnMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          column: payload,
          id: 'column-1',
          noteTypeId,
        })
      ).resolves.toEqual(updatedColumn)
    })

    expect(updateColumn).toHaveBeenCalledWith(noteTypeId, 'column-1', payload)
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: settingsQueryKeys.columns(noteTypeId),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: settingsQueryKeys.noteTypeDetail(noteTypeId),
    })
  })

  it('reorders columns and invalidates the scoped columns query', async () => {
    const payload: ReorderColumnsDto = {
      columnIds: ['column-1', 'column-2'],
    }
    const reorderedColumns = [
      createColumnDto('column-1'),
      createColumnDto('column-2'),
    ]
    vi.mocked(reorderColumns).mockResolvedValue(
      createResponse(reorderedColumns)
    )
    const queryClient = createTestQueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useReorderColumnsMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await expect(
        result.current.mutateAsync({ columnOrder: payload, noteTypeId })
      ).resolves.toEqual(reorderedColumns)
    })

    expect(reorderColumns).toHaveBeenCalledWith(noteTypeId, payload)
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: settingsQueryKeys.columns(noteTypeId),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: settingsQueryKeys.noteTypeDetail(noteTypeId),
    })
  })

  it('deletes columns and invalidates the scoped columns query', async () => {
    vi.mocked(deleteColumn).mockResolvedValue(createResponse<void>(undefined))
    const queryClient = createTestQueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteColumnMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          id: 'column-1',
          noteTypeId,
          query: { deleteMode: 'definitionOnly' },
        })
      ).resolves.toBeUndefined()
    })

    expect(deleteColumn).toHaveBeenCalledWith(noteTypeId, 'column-1', {
      deleteMode: 'definitionOnly',
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: settingsQueryKeys.columns(noteTypeId),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: settingsQueryKeys.noteTypeDetail(noteTypeId),
    })
  })

  it('deletes columns with values and invalidates columns and notes queries', async () => {
    vi.mocked(deleteColumn).mockResolvedValue(createResponse<void>(undefined))
    const queryClient = createTestQueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteColumnMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          id: 'column-1',
          noteTypeId,
          query: { deleteMode: 'definitionAndValues' },
        })
      ).resolves.toBeUndefined()
    })

    expect(deleteColumn).toHaveBeenCalledWith(noteTypeId, 'column-1', {
      deleteMode: 'definitionAndValues',
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: settingsQueryKeys.columns(noteTypeId),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: settingsQueryKeys.noteTypeDetail(noteTypeId),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: notesQueryKeys.lists(),
    })
  })

  it('updates general settings and invalidates the general settings query', async () => {
    const payload: UpdateGeneralSettingsDto = {
      cardFieldDisplayCount: 4,
      textTruncationLength: 180,
    }
    const updatedSettings = createGeneralSettingsDto()
    vi.mocked(updateGeneralSettings).mockResolvedValue(
      createResponse(updatedSettings)
    )
    const queryClient = createTestQueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateGeneralSettingsMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await expect(result.current.mutateAsync(payload)).resolves.toEqual(
        updatedSettings
      )
    })

    expect(updateGeneralSettings).toHaveBeenCalledWith(payload)
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: settingsQueryKeys.general(),
    })
  })

  it('exports app data without invalidating cached queries', async () => {
    const exportData = createExportImportDataDto()
    vi.mocked(getExportData).mockResolvedValue(createResponse(exportData))
    const queryClient = createTestQueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useExportDataMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await expect(result.current.mutateAsync()).resolves.toEqual(exportData)
    })

    expect(getExportData).toHaveBeenCalledWith()
    expect(invalidateQueries).not.toHaveBeenCalled()
  })

  it('imports app data and invalidates settings and notes queries', async () => {
    const payload = new File([JSON.stringify(createExportImportDataDto())], 'backup.json', {
      type: 'application/json',
    })
    const importResult = createImportResultDto()
    vi.mocked(importData).mockResolvedValue(createResponse(importResult))
    const queryClient = createTestQueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useImportDataMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await expect(result.current.mutateAsync(payload)).resolves.toEqual(
        importResult
      )
    })

    expect(importData).toHaveBeenCalledWith(payload)
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: settingsQueryKeys.all(),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: notesQueryKeys.lists(),
    })
  })

  it('deletes all notes and invalidates notes lists', async () => {
    const deleteResult = createDeleteAllNotesResultDto()
    vi.mocked(deleteAllNotes).mockResolvedValue(createResponse(deleteResult))
    const queryClient = createTestQueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteAllNotesMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await expect(result.current.mutateAsync()).resolves.toEqual(deleteResult)
    })

    expect(deleteAllNotes).toHaveBeenCalledWith()
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: notesQueryKeys.lists(),
    })
  })
})
