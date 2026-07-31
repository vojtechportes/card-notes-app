import { normalizeForStableJson } from './normalize-for-stable-json.util'

export const stableStringify = (value: unknown): string =>
  JSON.stringify(normalizeForStableJson(value))
