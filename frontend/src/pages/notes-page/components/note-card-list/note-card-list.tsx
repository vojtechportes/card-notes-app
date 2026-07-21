import { Card, CardContent, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Masonry } from '../../../../components/masonry/masonry'
import type {
  ColumnDto,
  GeneralSettingsDto,
  LabelDto,
  NoteDto,
} from '../../../../types/api'
import { NoteCard } from '../note-card/note-card'

interface NoteCardListProps {
  columns: ColumnDto[]
  generalSettings: GeneralSettingsDto
  labels?: LabelDto[]
  noteTypeColumnsById?: Record<string, ColumnDto[]>
  notes: NoteDto[]
  onDeleteNote?: (note: NoteDto) => void
  onEditNote?: (note: NoteDto) => void
  onOpenNoteDetail?: (note: NoteDto) => void
  selectedNoteId?: string
}

export const NoteCardList = ({
  columns,
  generalSettings,
  labels = [],
  noteTypeColumnsById,
  notes,
  onDeleteNote,
  onEditNote,
  onOpenNoteDetail,
  selectedNoteId,
}: NoteCardListProps) => {
  const { t } = useTranslation()

  if (notes.length === 0) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1}>
            <Typography component="h3" variant="h6">
              {t('notes.empty.title')}
            </Typography>
            <Typography color="text.secondary">
              {t('notes.empty.description')}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  return (
    <Masonry columns={{ xs: 1, sm: 1, md: 2, lg: 3 }} gap={16}>
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          columns={noteTypeColumnsById?.[note.noteTypeId] ?? columns}
          generalSettings={generalSettings}
          isSelected={note.id === selectedNoteId}
          labels={labels}
          note={note}
          onDeleteNote={onDeleteNote}
          onEditNote={onEditNote}
          onOpenNoteDetail={onOpenNoteDetail}
        />
      ))}
    </Masonry>
  )
}
