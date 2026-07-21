const SETTINGS_QUERY_KEY = ['settings'] as const

export const settingsQueryKeys = {
  all: () => SETTINGS_QUERY_KEY,
  labels: () => [...SETTINGS_QUERY_KEY, 'labels'] as const,
  noteTypes: () => [...SETTINGS_QUERY_KEY, 'note-types'] as const,
  noteTypeDetail: (noteTypeId: string | undefined) =>
    [...settingsQueryKeys.noteTypes(), 'detail', noteTypeId] as const,
  columns: (noteTypeId: string | undefined) =>
    [...SETTINGS_QUERY_KEY, 'columns', noteTypeId] as const,
  general: () => [...SETTINGS_QUERY_KEY, 'general'] as const,
}
