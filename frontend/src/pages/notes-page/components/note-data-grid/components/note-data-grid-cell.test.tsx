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

  it('renders the first multi-image preview and a 48 by 48 remaining-count tile', async () => {
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
          { altText: 'Third image', dataUrl: 'data:image/png;base64,ZmFrZTM=' },
        ],
      },
      null,
      rowClick,
      rowKeyDown
    )

    const preview = screen.getByRole('button', { name: 'First image' })
    const remainingImages = screen.getByLabelText('2 more images')
    const gallery = screen.getByTestId('note-data-grid-image-gallery')

    expect(getComputedStyle(gallery).flexWrap).toBe('wrap')
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.getByText('+2')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Second image' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Third image' })).toBeNull()
    expect(getComputedStyle(preview.parentElement as Element).height).toBe(
      '48px'
    )
    expect(getComputedStyle(preview.parentElement as Element).width).toBe(
      '48px'
    )
    expect(getComputedStyle(remainingImages).height).toBe('48px')
    expect(getComputedStyle(remainingImages).width).toBe('48px')

    fireEvent.click(preview)
    fireEvent.keyDown(preview, { key: 'Enter' })
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

    fireEvent.click(remainingImages)
    expect(rowClick).toHaveBeenCalledTimes(1)
  })

  it('renders full and truncated wrapping for text and links without ellipsis', () => {
    renderCell(baseColumn, { field: 'Full text that can wrap' })

    const fullText = screen.getByText('Full text that can wrap')
    expect(getComputedStyle(fullText).overflowWrap).toBe('anywhere')
    expect(getComputedStyle(fullText).textOverflow).not.toBe('ellipsis')

    cleanup()
    renderCell(
      { ...baseColumn, type: 'link' },
      { field: 'https://example.com/a-very-long-path' },
      16
    )

    const truncatedLink = screen.getByRole('link', {
      name: 'https://examp...',
    })
    expect(getComputedStyle(truncatedLink).overflowWrap).toBe('anywhere')
    expect(getComputedStyle(truncatedLink).textOverflow).not.toBe('ellipsis')

    cleanup()
    renderCell(
      { ...baseColumn, type: 'labels' },
      { field: ['favorite', 'missing'] }
    )

    const labelContainer = screen
      .getByText('Favorite')
      .closest('.MuiStack-root')
    expect(labelContainer).toBeTruthy()
    expect(getComputedStyle(labelContainer!).flexWrap).toBe('wrap')
  })

  it('renders a clickable single-image tile at exactly 48 by 48 pixels and isolates row events', () => {
    const rowClick = vi.fn()
    const rowKeyDown = vi.fn()

    renderCell(
      { ...baseColumn, type: 'image' },
      {
        field: {
          altText: 'Cover image',
          dataUrl: 'data:image/png;base64,ZmFrZQ==',
        },
      },
      null,
      rowClick,
      rowKeyDown
    )

    const preview = screen.getByRole('button', { name: 'Cover image' })

    expect(getComputedStyle(preview.parentElement as Element).height).toBe(
      '48px'
    )
    expect(getComputedStyle(preview.parentElement as Element).width).toBe(
      '48px'
    )

    fireEvent.click(preview)
    fireEvent.keyDown(preview, { key: ' ' })

    expect(rowClick).not.toHaveBeenCalled()
    expect(rowKeyDown).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: 'Close image preview' })
    ).toBeTruthy()
  })

  it('does not render an overflow tile for one multi-image value', () => {
    renderCell(
      { ...baseColumn, config: { isMultiImage: true }, type: 'image' },
      {
        field: [
          { altText: 'Only image', dataUrl: 'data:image/png;base64,ZmFrZQ==' },
        ],
      }
    )

    expect(screen.getByRole('button', { name: 'Only image' })).toBeTruthy()
    expect(screen.queryByText(/^\+\d+$/)).toBeNull()
  })
})
