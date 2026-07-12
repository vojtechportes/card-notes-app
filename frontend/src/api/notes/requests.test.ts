import type { AxiosResponse } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  CreateNoteDto,
  DeleteAllNotesResultDto,
  ListNotesQueryDto,
  NoteDto,
  UpdateNoteDto,
} from '../../types/api'
import {
  createNote,
  deleteAllNotes,
  deleteNote,
  getNotes,
  updateNote,
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

describe('notes requests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches notes with serialized note type ids and an abort signal', () => {
    const query: ListNotesQueryDto = {
      noteTypeIds: ['note-type-1', 'note-type-2'],
      sortBy: 'updatedAt',
      sortDirection: 'asc',
    }
    const signal = new AbortController().signal
    const response = Promise.resolve(createResponse<NoteDto[]>([]))
    apiClientMock.get.mockReturnValue(response)

    const result = getNotes(query, signal)

    expect(result).toBe(response)
    expect(apiClientMock.get).toHaveBeenCalledWith('/notes', {
      params: {
        noteTypeIds: 'note-type-1,note-type-2',
        sortBy: 'updatedAt',
        sortDirection: 'asc',
      },
      signal,
    })
  })

  it('creates a note', () => {
    const note: CreateNoteDto = {
      noteTypeId: 'note-type-1',
      values: { title: 'First note' },
    }
    const response = Promise.resolve(createResponse({ id: 'note-1' }))
    apiClientMock.post.mockReturnValue(response)

    const result = createNote(note)

    expect(result).toBe(response)
    expect(apiClientMock.post).toHaveBeenCalledWith('/notes', note)
  })

  it('updates a note', () => {
    const note: UpdateNoteDto = { values: { title: 'Updated note' } }
    const response = Promise.resolve(createResponse({ id: 'note-1' }))
    apiClientMock.patch.mockReturnValue(response)

    const result = updateNote('note-1', note)

    expect(result).toBe(response)
    expect(apiClientMock.patch).toHaveBeenCalledWith('/notes/note-1', note)
  })

  it('deletes all notes', () => {
    const response = Promise.resolve(
      createResponse<DeleteAllNotesResultDto>({ deletedCount: 12 })
    )
    apiClientMock.delete.mockReturnValue(response)

    const result = deleteAllNotes()

    expect(result).toBe(response)
    expect(apiClientMock.delete).toHaveBeenCalledWith('/notes')
  })

  it('deletes a note', () => {
    const response = Promise.resolve(createResponse<void>(undefined))
    apiClientMock.delete.mockReturnValue(response)

    const result = deleteNote('note-1')

    expect(result).toBe(response)
    expect(apiClientMock.delete).toHaveBeenCalledWith('/notes/note-1')
  })
})
