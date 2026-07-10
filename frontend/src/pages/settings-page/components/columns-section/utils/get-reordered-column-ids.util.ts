import { arrayMove } from '@dnd-kit/sortable'
import type { ColumnDto } from '../../../../../types/api'

export const getReorderedColumnIds = (
  columns: ColumnDto[],
  activeId: string,
  overId: string
) => {
  const activeIndex = columns.findIndex((column) => column.id === activeId)
  const overIndex = columns.findIndex((column) => column.id === overId)

  if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
    return null
  }

  return arrayMove(columns, activeIndex, overIndex).map((column) => column.id)
}
