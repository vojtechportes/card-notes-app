import type { ListNotesQueryDto } from '../../../types/api'

const NOTES_QUERY_KEY = ['notes'] as const

export const notesQueryKeys = {
  all: () => NOTES_QUERY_KEY,
  lists: () => [...NOTES_QUERY_KEY, 'list'] as const,
  list: (query: ListNotesQueryDto = {}) =>
    [...notesQueryKeys.lists(), query] as const,
}
