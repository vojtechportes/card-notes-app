import { collectSearchValueParts } from './collect-search-value-parts.util';

export const normalizeNoteSearchValue = (value: unknown): string => {
  return collectSearchValueParts(value, new Set(), 0).join(' ');
};
