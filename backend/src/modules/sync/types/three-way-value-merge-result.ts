export interface ThreeWayValueMergeResult<TValue> {
  value: TValue
  hasConflict: boolean
  losingValue?: TValue
}
