import type { ColumnTypeEnum } from './column-type-enum'

export interface NoteColumn {
  id: string
  noteTypeId: string
  name: string
  title: string
  type: ColumnTypeEnum
  sortOrder: number
  isHidden: boolean
  isHiddenInDetail: boolean
  isDefault: boolean
  config: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export interface CreateColumnInput {
  name: string
  title: string
  type: ColumnTypeEnum
  sortOrder?: number
  isHidden?: boolean
  isHiddenInDetail?: boolean
  config?: Record<string, unknown> | null
}

export interface UpdateColumnInput {
  name?: string
  title?: string
  type?: ColumnTypeEnum
  sortOrder?: number
  isHidden?: boolean
  isHiddenInDetail?: boolean
  config?: Record<string, unknown> | null
}
