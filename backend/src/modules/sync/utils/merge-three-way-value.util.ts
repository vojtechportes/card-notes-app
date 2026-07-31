import type { ThreeWayValueMergeResult } from '../types/three-way-value-merge-result'
import { areSyncValuesEqual } from './are-sync-values-equal.util'

export const mergeThreeWayValue = <TValue>(
  base: TValue,
  local: TValue,
  remote: TValue,
  preferLocal: boolean
): ThreeWayValueMergeResult<TValue> => {
  if (areSyncValuesEqual(local, remote)) {
    return { value: local, hasConflict: false }
  }

  if (areSyncValuesEqual(local, base)) {
    return { value: remote, hasConflict: false }
  }

  if (areSyncValuesEqual(remote, base)) {
    return { value: local, hasConflict: false }
  }

  return {
    value: preferLocal ? local : remote,
    hasConflict: true,
    losingValue: preferLocal ? remote : local,
  }
}
