import type { AxiosResponse } from 'axios';
import { apiClient } from '../../utils/api-client';
import type { CreateNoteDto, DeleteAllNotesResultDto, ListNotesQueryDto, NoteDto, UpdateNoteDto } from '../../types/api';

export const getNotes = (
  query?: ListNotesQueryDto,
  signal?: AbortSignal,
): Promise<AxiosResponse<NoteDto[]>> => {
  return apiClient.get<NoteDto[]>('/notes', {
    params: query,
    signal,
  });
};

export const createNote = (note: CreateNoteDto): Promise<AxiosResponse<NoteDto>> => {
  return apiClient.post<NoteDto>('/notes', note);
};

export const updateNote = (
  id: string,
  note: UpdateNoteDto,
): Promise<AxiosResponse<NoteDto>> => {
  return apiClient.patch<NoteDto>(`/notes/${id}`, note);
};

export const deleteAllNotes = (): Promise<AxiosResponse<DeleteAllNotesResultDto>> => {
  return apiClient.delete<DeleteAllNotesResultDto>('/notes');
};

export const deleteNote = (id: string): Promise<AxiosResponse<void>> => {
  return apiClient.delete<void>(`/notes/${id}`);
};
