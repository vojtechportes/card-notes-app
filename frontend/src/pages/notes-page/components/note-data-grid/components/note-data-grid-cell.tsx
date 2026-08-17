import { Box } from '@mui/material'
import type { ColumnDto, LabelDto, NoteDto } from '../../../../../types/api'
import { NoteFieldValue } from '../../note-field-value/note-field-value'
import type { NoteCardField } from '../../../types/note-card-field'
import { isImageNoteValue } from '../../../utils/is-image-note-value.util'
import { isNoteImageValueList } from '../../../utils/is-note-image-value-list.util'
import { resolveNoteCardColumnValue } from '../../../utils/resolve-note-card-column-value.util'
import { NoteDataGridImageCell } from './note-data-grid-image-cell'

interface NoteDataGridCellProps {
  column: ColumnDto
  labels: LabelDto[]
  note: NoteDto
  textTruncationLength: number | null
}

export const NoteDataGridCell = ({
  column,
  labels,
  note,
  textTruncationLength,
}: NoteDataGridCellProps) => {
  const value = resolveNoteCardColumnValue(note, column)
  const field: NoteCardField = {
    columnId: column.id,
    config: column.config,
    title: column.title,
    type: column.type,
    value,
  }

  if (
    column.type === 'image' &&
    (isImageNoteValue(value) || isNoteImageValueList(value))
  ) {
    return (
      <NoteDataGridImageCell
        config={column.config}
        title={column.title}
        value={value}
      />
    )
  }

  return (
    <Box sx={{ maxWidth: '100%', minWidth: 0 }}>
      <NoteFieldValue
        emptyImageLabel=""
        field={field}
        labels={labels}
        textTruncationLength={textTruncationLength}
      />
    </Box>
  )
}
