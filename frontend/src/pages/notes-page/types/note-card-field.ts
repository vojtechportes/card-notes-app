import type { ColumnDto, NoteDto } from '../../../types/api'

export type NoteCardFieldValue = NoteDto['values'][string] | string

export interface NoteCardField {
  columnId: string
  title: string
  type: ColumnDto['type']
  config?: ColumnDto['config']
  value: NoteCardFieldValue | undefined
}
