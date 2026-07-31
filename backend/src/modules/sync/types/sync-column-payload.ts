import type { ColumnTypeEnum } from '../../settings/types/column-type-enum'

export interface SyncColumnPayload {
  noteTypeId: string
  name: string
  title: string
  type: ColumnTypeEnum
  orderKey: string
  isHidden: boolean
  isHiddenInDetail: boolean
  isDefault: boolean
  config: Record<string, unknown> | null
}
