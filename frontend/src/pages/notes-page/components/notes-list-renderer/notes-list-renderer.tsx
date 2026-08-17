import type {
  BackgroundEnumDto,
  ColumnDto,
  GeneralSettingsDto,
  LabelDto,
  NoteDto,
} from '../../../../types/api'
import type { NotesViewMode } from '../../types/notes-view-mode'
import { NoteCardList } from '../note-card-list/note-card-list'
import { NoteDataGrid } from '../note-data-grid/note-data-grid'
import { NoteDataGridState } from '../note-data-grid/components/note-data-grid-state'
import { useTranslation } from 'react-i18next'

interface NotesListRendererProps {
  columnWidths: Record<string, number>
  columnsByNoteTypeId: Record<string, ColumnDto[]>
  error: boolean
  generalSettings?: GeneralSettingsDto
  labels: LabelDto[]
  loading: boolean
  notes: NoteDto[]
  onColumnWidthChange: (columnId: string, width: number) => void
  onDeleteNote: (note: NoteDto) => void
  onEditNote: (note: NoteDto) => void
  onOpenNoteDetail: (note: NoteDto) => void
  onUpdateNoteBackground: (note: NoteDto, background: BackgroundEnumDto) => void
  selectedNoteId?: string
  selectedNoteTypeId: string | null
  viewMode: NotesViewMode
}

export const NotesListRenderer = ({
  columnWidths,
  columnsByNoteTypeId,
  error,
  generalSettings,
  labels,
  loading,
  notes,
  onColumnWidthChange,
  onDeleteNote,
  onEditNote,
  onOpenNoteDetail,
  onUpdateNoteBackground,
  selectedNoteId,
  selectedNoteTypeId,
  viewMode,
}: NotesListRendererProps) => {
  const { t } = useTranslation()

  if (viewMode === 'data-grid') {
    if (!selectedNoteTypeId && !loading && !error) {
      return (
        <NoteDataGridState
          description={t('notes.dataGrid.noTemplate.description')}
          title={t('notes.dataGrid.noTemplate.title')}
        />
      )
    }

    return (
      <NoteDataGrid
        columnWidths={columnWidths}
        columns={columnsByNoteTypeId[selectedNoteTypeId ?? ''] ?? []}
        error={error}
        labels={labels}
        loading={loading}
        notes={notes}
        selectedNoteId={selectedNoteId}
        textTruncationLength={generalSettings?.textTruncationLength ?? null}
        onColumnWidthChange={onColumnWidthChange}
        onOpenNoteDetail={onOpenNoteDetail}
      />
    )
  }

  if (loading || error || !generalSettings) {
    return null
  }

  return (
    <NoteCardList
      columns={[]}
      generalSettings={generalSettings}
      labels={labels}
      noteTypeColumnsById={columnsByNoteTypeId}
      notes={notes}
      selectedNoteId={selectedNoteId}
      onDeleteNote={onDeleteNote}
      onEditNote={onEditNote}
      onOpenNoteDetail={onOpenNoteDetail}
      onUpdateNoteBackground={onUpdateNoteBackground}
    />
  )
}
