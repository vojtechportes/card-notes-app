import { stableStringify } from './stable-stringify.util'

export const areSyncValuesEqual = (left: unknown, right: unknown): boolean =>
  stableStringify(left) === stableStringify(right)
