import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { AxiosResponse } from 'axios'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreateNoteDto, NoteDto, UpdateNoteDto } from '../../../types/api'
import { notesQueryKeys } from '../constants/notes-query-keys'
import {
  useCreateNoteMutation,
  useDeleteNoteMutation,
  useNotesQuery,
  useUpdateNoteMutation,
} from './use-notes-query'
import {
  createNote,
  deleteNote,
  getNotes,
  updateNote,
} from '../../../api/notes/requests'

vi.mock('../../../api/notes/requests', () => ({
  createNote: vi.fn(),
  deleteNote: vi.fn(),
  getNotes: vi.fn(),
  updateNote: vi.fn(),
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

const createNoteDto = (id: string): NoteDto => ({
  createdAt: '2026-07-07T10:00:00.000Z',
  id,
  updatedAt: '2026-07-07T10:00:00.000Z',
  values: { title: `Note ${id}` },
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

describe('useNotesQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches notes and maps Axios response data', async () => {
    const notes = [createNoteDto('note-1')]
    vi.mocked(getNotes).mockResolvedValue(createResponse(notes))
    const queryClient = createTestQueryClient()

    const { result } = renderHook(() => useNotesQuery(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.data).toEqual(notes))
    expect(getNotes).toHaveBeenCalledWith(undefined, expect.any(AbortSignal))
  })

  it('keys notes lists by sort query', () => {
    expect(
      notesQueryKeys.list({ sortBy: 'createdAt', sortDirection: 'desc' })
    ).not.toEqual(
      notesQueryKeys.list({ sortBy: 'updatedAt', sortDirection: 'asc' })
    )
  })
})

describe('notes mutation hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates notes and invalidates notes lists', async () => {
    const payload: CreateNoteDto = { values: { title: 'Created note' } }
    const createdNote = createNoteDto('note-1')
    vi.mocked(createNote).mockResolvedValue(createResponse(createdNote))
    const queryClient = createTestQueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateNoteMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await expect(result.current.mutateAsync(payload)).resolves.toEqual(
        createdNote
      )
    })

    expect(createNote).toHaveBeenCalledWith(payload)
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: notesQueryKeys.lists(),
    })
  })

  it('updates notes and invalidates notes lists', async () => {
    const payload: UpdateNoteDto = { values: { title: 'Updated note' } }
    const updatedNote = createNoteDto('note-1')
    vi.mocked(updateNote).mockResolvedValue(createResponse(updatedNote))
    const queryClient = createTestQueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateNoteMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await expect(
        result.current.mutateAsync({ id: 'note-1', note: payload })
      ).resolves.toEqual(updatedNote)
    })

    expect(updateNote).toHaveBeenCalledWith('note-1', payload)
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: notesQueryKeys.lists(),
    })
  })

  it('deletes notes and invalidates notes lists', async () => {
    vi.mocked(deleteNote).mockResolvedValue(createResponse<void>(undefined))
    const queryClient = createTestQueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteNoteMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await expect(
        result.current.mutateAsync('note-1')
      ).resolves.toBeUndefined()
    })

    expect(deleteNote).toHaveBeenCalledWith('note-1')
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: notesQueryKeys.lists(),
    })
  })
})
