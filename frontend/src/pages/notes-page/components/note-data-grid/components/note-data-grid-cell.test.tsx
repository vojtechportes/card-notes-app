import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../../../../../components/app-providers/app-providers'
import type { ColumnDto, LabelDto, NoteDto } from '../../../../../types/api'
import '../../../../../i18n'
import { NoteDataGridCell } from './note-data-grid-cell'

const baseColumn: ColumnDto = {
  config: null,
  createdAt: '2026-08-14T10:00:00.000Z',
  id: 'field',
  isDefault: false,
  isHidden: false,
  isHiddenInDetail: false,
  name: 'field',
  noteTypeId: 'books',
  sortOrder: 0,
  title: 'Field',
  type: 'text',
  updatedAt: '2026-08-14T10:00:00.000Z',
}

const note: NoteDto = {
  background: null,
  createdAt: '2026-08-14T10:00:00.000Z',
  id: 'note-1',
  noteTypeId: 'books',
  updatedAt: '2026-08-14T11:00:00.000Z',
  values: {},
}

const labels: LabelDto[] = [
  {
    color: '#0070F2',
    createdAt: '2026-08-14T10:00:00.000Z',
    id: 'favorite',
    name: 'favorite',
    noteTypeId: null,
    title: 'Favorite',
    updatedAt: '2026-08-14T10:00:00.000Z',
  },
]

const renderCell = (
  column: ColumnDto,
  values: NoteDto['values'],
  textTruncationLength: number | null = null,
  onRowClick?: () => void,
  onRowKeyDown?: () => void
) =>
  render(
    <AppProviders>
      <div onClick={onRowClick} onKeyDown={onRowKeyDown}>
        <NoteDataGridCell
          column={column}
          labels={labels}
          note={{ ...note, values }}
          textTruncationLength={textTruncationLength}
        />
      </div>
    </AppProviders>
  )

afterEach(() => cleanup())

describe('NoteDataGridCell', () => {
  it('resolves metadata dates and truncates only configured text output', () => {
    renderCell(
      {
        ...baseColumn,
        id: 'created',
        isDefault: true,
        name: 'createdAt',
        type: 'date',
      },
      {}
    )

    expect(screen.getByText(/2026/)).toBeTruthy()

    cleanup()
    renderCell(baseColumn, { field: 'A long wrapped value' }, 8)
    expect(screen.getByText('A lon...')).toBeTruthy()

    cleanup()
    renderCell(baseColumn, { field: 'Full wrapped value' })
    expect(screen.getByText('Full wrapped value')).toBeTruthy()

    cleanup()
    renderCell({ ...baseColumn, type: 'number' }, { field: 42 })
    expect(screen.getByText('42')).toBeTruthy()
  })

  it('renders safe links, labels, and unsafe links consistently', () => {
    const stopPropagation = vi.fn()
    const stopKeyPropagation = vi.fn()
    render(
      <AppProviders>
        <div onClick={stopPropagation} onKeyDown={stopKeyPropagation}>
          <NoteDataGridCell
            column={{ ...baseColumn, type: 'link' }}
            labels={labels}
            note={{ ...note, values: { field: 'https://example.com/path' } }}
            textTruncationLength={null}
          />
        </div>
      </AppProviders>
    )

    const link = screen.getByRole('link', { name: 'https://example.com/path' })
    fireEvent.click(link)
    expect(stopPropagation).not.toHaveBeenCalled()
    fireEvent.keyDown(link, { key: 'Enter' })
    expect(stopKeyPropagation).not.toHaveBeenCalled()

    cleanup()
    renderCell(
      { ...baseColumn, type: 'link' },
      { field: 'javascript:alert(1)' }
    )
    expect(screen.queryByRole('link')).toBeNull()
    const unsafeLinkText = screen.getByText('javascript:alert(1)')
    const unsafeLinkRowClick = vi.fn()
    unsafeLinkText.parentElement?.addEventListener('click', unsafeLinkRowClick)
    fireEvent.click(unsafeLinkText)
    expect(unsafeLinkRowClick).toHaveBeenCalledTimes(1)

    cleanup()
    renderCell(
      { ...baseColumn, type: 'labels' },
      { field: ['favorite', 'missing'] }
    )
    expect(screen.getByText('Favorite')).toBeTruthy()
    expect(screen.getByText('Unavailable label')).toBeTruthy()
  })

  it('renders every multi-image preview at 48 by 48 and keeps each clickable', async () => {
    const rowClick = vi.fn()
    const rowKeyDown = vi.fn()

    renderCell(
      { ...baseColumn, config: { isMultiImage: true }, type: 'image' },
      {
        field: [
          { altText: 'First image', dataUrl: 'data:image/png;base64,ZmFrZQ==' },
          {
            altText: 'Second image',
            dataUrl: 'data:image/png;base64,ZmFrZTI=',
          },
        ],
      },
      null,
      rowClick,
      rowKeyDown
    )

    const previews = screen.getAllByRole('button')
    expect(previews).toHaveLength(2)
    previews.forEach((preview) => {
      expect(getComputedStyle(preview.parentElement as Element).height).toBe(
        '48px'
      )
      expect(getComputedStyle(preview.parentElement as Element).width).toBe(
        '48px'
      )
    })

    const gallery = screen.getByTestId('note-data-grid-image-gallery')

    fireEvent.click(previews[0])
    fireEvent.keyDown(previews[0], { key: 'Enter' })
    expect(rowClick).not.toHaveBeenCalled()
    expect(rowKeyDown).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: 'Close image preview' })
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Close image preview' }))
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Close image preview' })
      ).toBeNull()
    })

    fireEvent.click(gallery)
    expect(rowClick).toHaveBeenCalledTimes(1)

    fireEvent.click(previews[1])
    expect(
      screen.getByRole('presentation', { name: 'Second image' })
    ).toBeTruthy()
  })
})
