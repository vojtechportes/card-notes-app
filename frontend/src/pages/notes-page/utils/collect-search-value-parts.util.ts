import {
  EXCLUDED_SEARCH_METADATA_KEYS,
  MAX_SEARCH_VALUE_DEPTH,
} from '../constants/note-search.constants'
import { normalizePrimitiveSearchValue } from './normalize-primitive-search-value.util'

export const collectSearchValueParts = (
  value: unknown,
  visitedValues: Set<object>,
  depth: number
): string[] => {
  const primitiveValue = normalizePrimitiveSearchValue(value)

  if (primitiveValue !== '') {
    return [primitiveValue]
  }

  if (value == null || depth >= MAX_SEARCH_VALUE_DEPTH) {
    return []
  }

  if (value instanceof Date) {
    return [value.toISOString()]
  }

  if (typeof value !== 'object') {
    return []
  }

  if (visitedValues.has(value)) {
    return []
  }

  visitedValues.add(value)

  if (Array.isArray(value)) {
    return value.flatMap((item) =>
      collectSearchValueParts(item, visitedValues, depth + 1)
    )
  }

  return Object.entries(value).flatMap(([key, item]) => {
    if (EXCLUDED_SEARCH_METADATA_KEYS.has(key)) {
      return []
    }

    return collectSearchValueParts(item, visitedValues, depth + 1)
  })
}
