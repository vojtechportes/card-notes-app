import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../../../../components/app-providers/app-providers'
import type { ColumnDto, NoteDto } from '../../../../types/api'
import '../../../../i18n'
import { NoteDataGrid } from './note-data-grid'

class ResizeObserverMock {
  observe() {
    return undefined
  }

  unobserve() {
    return undefined
  }

  disconnect() {
    return undefined
  }
}

globalThis.ResizeObserver =
  ResizeObserverMock as unknown as typeof ResizeObserver

const column: ColumnDto = {
  config: null,
  createdAt: '2026-08-14T10:00:00.000Z',
  id: 'title',
  isDefault: false,
  isHidden: false,
  isHiddenInDetail: false,
  name: 'title',
  noteTypeId: 'books',
  sortOrder: 0,
  title: 'Title',
  type: 'text',
  updatedAt: '2026-08-14T10:00:00.000Z',
}

const createNote = (index: number): NoteDto => ({
  background: null,
  createdAt: '2026-08-14T10:00:00.000Z',
  id: `note-${index}`,
  noteTypeId: 'books',
  updatedAt: '2026-08-14T11:00:00.000Z',
  values: { title: `Note ${index}` },
})

const renderGrid = (notes: NoteDto[]) =>
  render(
    <AppProviders>
      <NoteDataGrid
        columnWidths={{}}
        columns={[column]}
        labels={[]}
        notes={notes}
        onColumnWidthChange={vi.fn()}
        onOpenNoteDetail={vi.fn()}
        textTruncationLength={null}
      />
    </AppProviders>
  )

afterEach(() => cleanup())

describe('NoteDataGrid integration', () => {
  it('keeps configured headers mounted with the localized no-rows overlay', () => {
    renderGrid([])

    expect(screen.getByRole('columnheader', { name: 'Title' })).toBeTruthy()
    expect(screen.getByText('No notes to show')).toBeTruthy()

    const grid = screen.getByRole('grid')
    const main = document.querySelector('.MuiDataGrid-mainContent')
    const columnHeaders = document.querySelector('.MuiDataGrid-columnHeaders')
    const virtualScroller = document.querySelector(
      '.MuiDataGrid-virtualScroller'
    )

    expect(main).toBeTruthy()
    expect(columnHeaders).toBeTruthy()
    expect(virtualScroller).toBeTruthy()
    expect(main?.contains(columnHeaders)).toBe(true)
    expect(main?.contains(virtualScroller)).toBe(true)
    expect(
      document.querySelectorAll('.MuiDataGrid-scrollbar--vertical')
    ).toHaveLength(1)
  })

  it('keeps more than 100 results in one logical grid page', async () => {
    renderGrid(Array.from({ length: 101 }, (_, index) => createNote(index)))

    await waitFor(() => {
      expect(screen.getByRole('grid').getAttribute('aria-rowcount')).toBe('102')
    })

    expect(screen.queryByRole('button', { name: /next page/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /previous page/i })).toBeNull()
    expect(screen.queryByText(/rows per page/i)).toBeNull()
  })
})
