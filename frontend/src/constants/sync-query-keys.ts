const SYNC_QUERY_KEY = ['synchronization'] as const

export const syncQueryKeys = {
  all: () => SYNC_QUERY_KEY,
  status: () => [...SYNC_QUERY_KEY, 'status'] as const,
  providers: () => [...SYNC_QUERY_KEY, 'providers'] as const,
  conflicts: () => [...SYNC_QUERY_KEY, 'conflicts'] as const,
  conflict: (id: string) => [...SYNC_QUERY_KEY, 'conflicts', id] as const,
}
