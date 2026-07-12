import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../../../../i18n'
import { NotesToolbar } from './notes-toolbar'
import type { NoteSortBy, NoteSortDirection } from './notes-toolbar'

class IntersectionObserverMock {
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

const createProps = () => ({
  isNoteTypesLoading: false,
  noteTypes: [
    {
      createdAt: '2026-07-07T10:00:00.000Z',
      id: 'note-type-1',
      title: 'Books',
      updatedAt: '2026-07-07T10:00:00.000Z',
    },
  ],
  onAddNote: vi.fn(),
  onNoteTypeIdsChange: vi.fn<(noteTypeIds: string[]) => void>(),
  onSearchQueryChange: vi.fn(),
  onSortByChange: vi.fn<(sortBy: NoteSortBy) => void>(),
  onSortDirectionChange: vi.fn<(sortDirection: NoteSortDirection) => void>(),
  searchQuery: '',
  selectedNoteTypeIds: [],
  sortBy: 'updatedAt' as NoteSortBy,
  sortDirection: 'desc' as NoteSortDirection,
})

describe('NotesToolbar', () => {
  beforeEach(() => {
    globalThis.IntersectionObserver =
      IntersectionObserverMock as unknown as typeof IntersectionObserver
  })

  afterEach(() => {
    cleanup()
  })

  it('renders search, sort, filter, and add note controls', () => {
    render(<NotesToolbar {...createProps()} />)

    expect(screen.getByRole('textbox', { name: 'Search notes' })).toBeTruthy()
    expect(screen.getByLabelText('Sort by')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ascending' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Descending' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Filters' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add note' })).toBeTruthy()
  })

  it('notifies when the search query changes', () => {
    const props = createProps()
    render(<NotesToolbar {...props} />)

    fireEvent.change(screen.getByRole('textbox', { name: 'Search notes' }), {
      target: { value: 'alpha' },
    })

    expect(props.onSearchQueryChange).toHaveBeenCalledWith('alpha')
  })

  it('notifies when the sort field changes', () => {
    const props = createProps()
    render(<NotesToolbar {...props} />)

    fireEvent.change(screen.getByLabelText('Sort by'), {
      target: { value: 'createdAt' },
    })

    expect(props.onSortByChange).toHaveBeenCalledWith('createdAt')
  })

  it('notifies when the sort direction changes', () => {
    const props = createProps()
    render(<NotesToolbar {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Ascending' }))

    expect(props.onSortDirectionChange).toHaveBeenCalledWith('asc')
  })

  it('notifies when adding a note is requested', () => {
    const props = createProps()
    render(<NotesToolbar {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Add note' }))

    expect(props.onAddNote).toHaveBeenCalled()
  })

  it('opens the advanced filter popover and toggles note types', () => {
    const props = createProps()
    render(<NotesToolbar {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Books' }))

    expect(props.onNoteTypeIdsChange).toHaveBeenCalledWith(['note-type-1'])
  })
})
