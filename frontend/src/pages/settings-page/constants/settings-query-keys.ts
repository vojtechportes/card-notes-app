const SETTINGS_QUERY_KEY = ['settings'] as const;

export const settingsQueryKeys = {
  all: () => SETTINGS_QUERY_KEY,
  columns: () => [...SETTINGS_QUERY_KEY, 'columns'] as const,
  general: () => [...SETTINGS_QUERY_KEY, 'general'] as const,
};
