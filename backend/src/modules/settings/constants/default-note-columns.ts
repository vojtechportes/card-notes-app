import { ColumnTypeEnum } from '../types/column-type-enum'

export interface DefaultNoteColumnDefinition {
  name: string
  title: string
  type: ColumnTypeEnum
  sortOrder: number
}

export const defaultNoteColumns: DefaultNoteColumnDefinition[] = [
  {
    name: 'createdAt',
    title: 'Created at',
    type: ColumnTypeEnum.Date,
    sortOrder: 0,
  },
  {
    name: 'updatedAt',
    title: 'Updated at',
    type: ColumnTypeEnum.Date,
    sortOrder: 1,
  },
]
