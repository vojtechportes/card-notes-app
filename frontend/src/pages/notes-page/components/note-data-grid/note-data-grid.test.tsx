import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../../../../components/app-providers/app-providers'
import type { ColumnDto, NoteDto } from '../../../../types/api'
import '../../../../i18n'
import { NOTE_DATA_GRID_MAX_COLUMN_WIDTH } from './constants/note-data-grid.constants'
import { NoteDataGrid } from './note-data-grid'

interface CapturedGridColumn {
  field: string
  maxWidth: number
  minWidth: number
  sortable: boolean
  width: number
}

interface CapturedGridProps {
  autosizeOnMount: boolean
  columns: CapturedGridColumn[]
  disableAutosize: boolean
  disableColumnFilter: boolean
  disableColumnMenu: boolean
  disableRowSelectionOnClick: boolean
  getEstimatedRowHeight: () => number
  getRowClassName: (params: { id: string }) => string
  getRowHeight: () => string
  hideFooter: boolean
  onCellKeyDown: (
    params: { row: NoteDto },
    event: KeyboardEvent & { defaultMuiPrevented?: boolean }
  ) => void
  onColumnWidthChange: (params: {
    colDef: { field: string }
    width: number
  }) => void
  onRowClick: (params: { row: NoteDto }) => void
  paginationModel: { page: number; pageSize: number }
  rows: NoteDto[]
  scrollbarSize: number
  slots: { noRowsOverlay?: () => React.ReactNode }
  showToolbar: boolean
  sx: Record<string, { width?: string }>
}

const gridHarness = vi.hoisted(() => ({
  props: null as CapturedGridProps | null,
  resetRowHeights: vi.fn(),
}))

vi.mock('@mui/x-data-grid', () => ({
  DataGrid: (props: CapturedGridProps) => {
    gridHarness.props = props
    const NoRowsOverlay = props.slots.noRowsOverlay

    return (
      <div aria-label="mock-data-grid" role="grid">
        {props.rows.length === 0 && NoRowsOverlay ? <NoRowsOverlay /> : null}
      </div>
    )
  },
  useGridApiRef: () => ({
    current: { resetRowHeights: gridHarness.resetRowHeights },
  }),
}))

const columns: ColumnDto[] = [
  {
    config: null,
    createdAt: '2026-08-14T10:00:00.000Z',
    id: 'hidden',
    isDefault: false,
    isHidden: true,
    isHiddenInDetail: false,
    name: 'hidden',
    noteTypeId: 'books',
    sortOrder: 0,
    title: 'Hidden',
    type: 'text',
    updatedAt: '2026-08-14T10:00:00.000Z',
  },
  {
    config: null,
    createdAt: '2026-08-14T10:00:00.000Z',
    id: 'count',
    isDefault: false,
    isHidden: false,
    isHiddenInDetail: false,
    name: 'count',
    noteTypeId: 'books',
    sortOrder: 2,
    title: 'Count',
    type: 'number',
    updatedAt: '2026-08-14T10:00:00.000Z',
  },
  {
    config: null,
    createdAt: '2026-08-14T10:00:00.000Z',
    id: 'title',
    isDefault: false,
    isHidden: false,
    isHiddenInDetail: false,
    name: 'title',
    noteTypeId: 'books',
    sortOrder: 1,
    title: 'Title',
    type: 'text',
    updatedAt: '2026-08-14T10:00:00.000Z',
  },
]

const note: NoteDto = {
  background: null,
  createdAt: '2026-08-14T10:00:00.000Z',
  id: 'note-1',
  noteTypeId: 'books',
  updatedAt: '2026-08-14T11:00:00.000Z',
  values: { count: 2, title: 'A note' },
}

const renderGrid = (
  onColumnWidthChange = vi.fn(),
  onOpenNoteDetail = vi.fn()
) => {
  render(
    <AppProviders>
      <NoteDataGrid
        columnWidths={{ title: 360 }}
        columns={columns}
        labels={[]}
        notes={[note]}
        onColumnWidthChange={onColumnWidthChange}
        onOpenNoteDetail={onOpenNoteDetail}
        selectedNoteId="note-1"
        textTruncationLength={null}
      />
    </AppProviders>
  )

  if (!gridHarness.props) {
    throw new Error('Expected Data Grid props to be captured.')
  }

  return gridHarness.props
}

afterEach(() => {
  cleanup()
  gridHarness.props = null
  gridHarness.resetRowHeights.mockReset()
})

describe('NoteDataGrid', () => {
  it('configures a read-only all-results grid with sorted visible fixed-width columns', () => {
    const props = renderGrid()

    expect(props.columns.map(({ field }) => field)).toEqual(['title', 'count'])
    expect(props.columns.map(({ width }) => width)).toEqual([360, 90])
    expect(props.columns.every(({ sortable }) => !sortable)).toBe(true)
    expect(props.columns.every((column) => !('flex' in column))).toBe(true)
    expect(props.autosizeOnMount).toBe(false)
    expect(props.disableAutosize).toBe(true)
    expect(props.disableColumnFilter).toBe(true)
    expect(props.disableColumnMenu).toBe(true)
    expect(props.disableRowSelectionOnClick).toBe(true)
    expect(props.paginationModel).toEqual({ page: 0, pageSize: -1 })
    expect(props.hideFooter).toBe(true)
    expect(props.showToolbar).toBe(false)
    expect(props.scrollbarSize).toBe(14)
    expect(props.sx['& .MuiDataGrid-main'].width).toBe(
      'calc(100% - ((1 - var(--DataGrid-hasScrollY)) * 14px))'
    )
    expect(props.getRowClassName({ id: 'note-1' })).toBe(
      'note-data-grid-row--selected'
    )
    expect(props.getRowHeight()).toBe('auto')
    expect(props.getEstimatedRowHeight()).toBe(72)
  })

  it('commits clamped widths and resets automatic row measurements', () => {
    const onColumnWidthChange = vi.fn()
    const props = renderGrid(onColumnWidthChange)

    props.onColumnWidthChange({
      colDef: { field: 'title' },
      width: NOTE_DATA_GRID_MAX_COLUMN_WIDTH + 100,
    })

    expect(onColumnWidthChange).toHaveBeenCalledWith(
      'title',
      NOTE_DATA_GRID_MAX_COLUMN_WIDTH
    )
    expect(gridHarness.resetRowHeights).toHaveBeenCalledTimes(1)
  })

  it('opens a row from click and non-interactive keyboard activation only', () => {
    const onOpenNoteDetail = vi.fn()
    const props = renderGrid(vi.fn(), onOpenNoteDetail)

    props.onRowClick({ row: note })
    expect(onOpenNoteDetail).toHaveBeenCalledWith(note)

    const cell = document.createElement('div')
    const keyboardEvent = {
      defaultMuiPrevented: false,
      key: 'Enter',
      preventDefault: vi.fn(),
      target: cell,
    } as unknown as KeyboardEvent & { defaultMuiPrevented?: boolean }
    props.onCellKeyDown({ row: note }, keyboardEvent)

    expect(keyboardEvent.preventDefault).toHaveBeenCalled()
    expect(keyboardEvent.defaultMuiPrevented).toBe(true)
    expect(onOpenNoteDetail).toHaveBeenCalledTimes(2)

    const link = document.createElement('a')
    props.onCellKeyDown({ row: note }, {
      defaultMuiPrevented: false,
      key: ' ',
      preventDefault: vi.fn(),
      target: link,
    } as unknown as KeyboardEvent & { defaultMuiPrevented?: boolean })
    expect(onOpenNoteDetail).toHaveBeenCalledTimes(2)
  })

  it('renders localized empty and error states', () => {
    render(
      <AppProviders>
        <NoteDataGrid
          columnWidths={{}}
          columns={columns}
          labels={[]}
          notes={[]}
          onColumnWidthChange={vi.fn()}
          onOpenNoteDetail={vi.fn()}
          textTruncationLength={null}
        />
      </AppProviders>
    )
    expect(screen.getByRole('grid')).toBeTruthy()
    expect(screen.getByText('No notes to show')).toBeTruthy()
    expect(gridHarness.props?.columns.map(({ field }) => field)).toEqual([
      'title',
      'count',
    ])

    cleanup()
    render(
      <AppProviders>
        <NoteDataGrid
          columnWidths={{}}
          columns={columns}
          error
          labels={[]}
          notes={[]}
          onColumnWidthChange={vi.fn()}
          onOpenNoteDetail={vi.fn()}
          textTruncationLength={null}
        />
      </AppProviders>
    )
    expect(screen.getByText('Data Grid unavailable')).toBeTruthy()
  })
})
