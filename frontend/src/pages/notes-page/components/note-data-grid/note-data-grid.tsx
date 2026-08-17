import { Box } from '@mui/material'
import {
  DataGrid,
  type GridCellParams,
  type GridColDef,
  type GridColumnResizeParams,
  type GridRenderCellParams,
  type MuiEvent,
  useGridApiRef,
} from '@mui/x-data-grid'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColumnDto, LabelDto, NoteDto } from '../../../../types/api'
import {
  NOTE_DATA_GRID_ESTIMATED_ROW_HEIGHT,
  NOTE_DATA_GRID_MAX_COLUMN_WIDTH,
  NOTE_DATA_GRID_MIN_COLUMN_WIDTH,
  NOTE_DATA_GRID_SCROLLBAR_GUTTER_WIDTH,
  NOTE_DATA_GRID_VIEWPORT_HEIGHT,
} from './constants/note-data-grid.constants'
import { NoteDataGridCell } from './components/note-data-grid-cell'
import { NoteDataGridLoadingOverlay } from './components/note-data-grid-loading-overlay'
import { NoteDataGridNoRowsOverlay } from './components/note-data-grid-no-rows-overlay'
import { NoteDataGridState } from './components/note-data-grid-state'
import { getVisibleNoteDataGridColumns } from './utils/get-visible-note-data-grid-columns.util'
import { isInteractiveGridTarget } from './utils/is-interactive-grid-target.util'
import { resolveNoteDataGridColumnWidth } from './utils/resolve-note-data-grid-column-width.util'

interface NoteDataGridProps {
  columnWidths: Record<string, number>
  columns: ColumnDto[]
  error?: boolean
  labels: LabelDto[]
  loading?: boolean
  notes: NoteDto[]
  onColumnWidthChange: (columnId: string, width: number) => void
  onOpenNoteDetail: (note: NoteDto) => void
  selectedNoteId?: string
  textTruncationLength: number | null
}

const getRowHeight = () => 'auto' as const
const getEstimatedRowHeight = () => NOTE_DATA_GRID_ESTIMATED_ROW_HEIGHT

export const NoteDataGrid = ({
  columnWidths,
  columns,
  error = false,
  labels,
  loading = false,
  notes,
  onColumnWidthChange,
  onOpenNoteDetail,
  selectedNoteId,
  textTruncationLength,
}: NoteDataGridProps) => {
  const { t } = useTranslation()
  const apiRef = useGridApiRef()
  const visibleColumns = useMemo(
    () => getVisibleNoteDataGridColumns(columns),
    [columns]
  )
  const gridColumns = useMemo<GridColDef<NoteDto>[]>(
    () =>
      visibleColumns.map((column) => ({
        field: column.id,
        headerName: column.title,
        maxWidth: NOTE_DATA_GRID_MAX_COLUMN_WIDTH,
        minWidth: NOTE_DATA_GRID_MIN_COLUMN_WIDTH,
        renderCell: (params: GridRenderCellParams<NoteDto>) => (
          <NoteDataGridCell
            column={column}
            labels={labels}
            note={params.row}
            textTruncationLength={textTruncationLength}
          />
        ),
        sortable: false,
        width: resolveNoteDataGridColumnWidth(column, columnWidths[column.id]),
      })),
    [columnWidths, labels, textTruncationLength, visibleColumns]
  )

  const handleColumnWidthChange = useCallback(
    (params: GridColumnResizeParams) => {
      const width = Math.min(
        NOTE_DATA_GRID_MAX_COLUMN_WIDTH,
        Math.max(NOTE_DATA_GRID_MIN_COLUMN_WIDTH, params.width)
      )

      onColumnWidthChange(params.colDef.field, width)
      apiRef.current?.resetRowHeights()
    },
    [apiRef, onColumnWidthChange]
  )

  const handleCellKeyDown = useCallback(
    (params: GridCellParams<NoteDto>, event: MuiEvent<React.KeyboardEvent>) => {
      if (
        (event.key !== 'Enter' && event.key !== ' ') ||
        isInteractiveGridTarget(event.target)
      ) {
        return
      }

      event.preventDefault()
      event.defaultMuiPrevented = true
      onOpenNoteDetail(params.row)
    },
    [onOpenNoteDetail]
  )

  if (error) {
    return (
      <NoteDataGridState
        description={t('notes.dataGrid.error.description')}
        title={t('notes.dataGrid.error.title')}
      />
    )
  }

  const detailCueId = 'note-data-grid-detail-cue'

  return (
    <Box
      sx={{
        height: NOTE_DATA_GRID_VIEWPORT_HEIGHT,
        minWidth: 0,
        width: '100%',
      }}
    >
      <Box
        id={detailCueId}
        sx={{
          border: 0,
          clip: 'rect(0 0 0 0)',
          height: 1,
          margin: -1,
          overflow: 'hidden',
          padding: 0,
          position: 'absolute',
          whiteSpace: 'nowrap',
          width: 1,
        }}
      >
        {t('notes.dataGrid.detailCue')}
      </Box>
      <DataGrid
        apiRef={apiRef}
        autosizeOnMount={false}
        aria-describedby={detailCueId}
        aria-label={t('notes.dataGrid.label')}
        columns={gridColumns}
        disableColumnFilter
        disableColumnMenu
        disableAutosize
        disableColumnSelector
        disableMultipleRowSelection
        disableRowSelectionOnClick
        disableVirtualization={false}
        getEstimatedRowHeight={getEstimatedRowHeight}
        getRowClassName={(params) =>
          params.id === selectedNoteId ? 'note-data-grid-row--selected' : ''
        }
        getRowHeight={getRowHeight}
        hideFooter
        loading={loading}
        paginationModel={{ page: 0, pageSize: -1 }}
        rowSelection={false}
        scrollbarSize={NOTE_DATA_GRID_SCROLLBAR_GUTTER_WIDTH}
        rows={notes}
        slots={{
          loadingOverlay: NoteDataGridLoadingOverlay,
          noRowsOverlay: NoteDataGridNoRowsOverlay,
        }}
        showToolbar={false}
        onCellKeyDown={handleCellKeyDown}
        onColumnWidthChange={handleColumnWidthChange}
        onRowClick={(params) => {
          onOpenNoteDetail(params.row)
        }}
        sx={{
          '& .MuiDataGrid-cell': {
            alignItems: 'flex-start',
            maxWidth: '100%',
            overflowWrap: 'anywhere',
            py: 1.5,
            whiteSpace: 'normal',
          },
          '& .MuiDataGrid-main': {
            width: `calc(100% - ((1 - var(--DataGrid-hasScrollY)) * ${NOTE_DATA_GRID_SCROLLBAR_GUTTER_WIDTH}px))`,
          },
          '& .MuiDataGrid-row': {
            cursor: 'pointer',
          },
          '& .MuiDataGrid-row.note-data-grid-row--selected': {
            backgroundColor: 'action.selected',
          },
          '& .MuiDataGrid-scrollbar--vertical': {
            overflowY: 'scroll',
            scrollbarGutter: 'stable',
          },
          '& .MuiDataGrid-virtualScroller': {
            overflowX: 'auto',
          },
        }}
      />
    </Box>
  )
}
