import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createNote,
  deleteNote,
  getNotes,
  updateNote,
} from '../../../api/notes/requests'
import type {
  CreateNoteDto,
  ListNotesQueryDto,
  UpdateNoteDto,
} from '../../../types/api'
import { notesQueryKeys } from '../constants/notes-query-keys'

interface UpdateNoteMutationVariables {
  id: string
  note: UpdateNoteDto
}

export const useNotesQuery = (query?: ListNotesQueryDto) => {
  return useQuery({
    queryKey: notesQueryKeys.list(query),
    queryFn: ({ signal }) =>
      getNotes(query, signal).then((response) => response.data),
  })
}

export const useCreateNoteMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (note: CreateNoteDto) =>
      createNote(note).then((response) => response.data),
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: notesQueryKeys.lists() })
    },
  })
}

export const useUpdateNoteMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, note }: UpdateNoteMutationVariables) => {
      return updateNote(id, note).then((response) => response.data)
    },
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: notesQueryKeys.lists() })
    },
  })
}

export const useDeleteNoteMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      deleteNote(id).then((response) => response.data),
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: notesQueryKeys.lists() })
    },
  })
}
