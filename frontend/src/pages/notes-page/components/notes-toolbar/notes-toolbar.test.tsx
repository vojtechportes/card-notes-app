import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { windowTitleBarHeight } from '../../../../constants/window-title-bar'
import '../../../../i18n'
import { NotesToolbar } from './notes-toolbar'
import type { NoteSortBy, NoteSortDirection } from './notes-toolbar'

let intersectionObserverCallback: IntersectionObserverCallback

class IntersectionObserverMock {
  constructor(callback: IntersectionObserverCallback) {
    intersectionObserverCallback = callback
  }

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
const createProps = () => ({
  isLabelsLoading: false,
  isNoteTypesLoading: false,
  labelMatchMode: 'or' as const,
  labels: [
    {
      color: '#0070F2',
      createdAt: '2026-07-07T10:00:00.000Z',
      id: 'label-1',
      name: 'favorite',
      noteTypeId: null,
      title: 'Favorite',
      updatedAt: '2026-07-07T10:00:00.000Z',
    },
  ],
  noteTypes: [
    {
      createdAt: '2026-07-07T10:00:00.000Z',
      id: 'note-type-1',
      title: 'Books',
      updatedAt: '2026-07-07T10:00:00.000Z',
    },
  ],
  onAddNote: vi.fn(),
  onLabelIdsChange: vi.fn<(labelIds: string[]) => void>(),
  onLabelMatchModeChange: vi.fn(),
  onNoteTypeIdsChange: vi.fn<(noteTypeIds: string[]) => void>(),
  onSearchQueryChange: vi.fn(),
  onSortByChange: vi.fn<(sortBy: NoteSortBy) => void>(),
  onSortDirectionChange: vi.fn<(sortDirection: NoteSortDirection) => void>(),
  searchQuery: '',
  selectedLabelIds: [],
  selectedNoteTypeIds: [],
  sortBy: 'updatedAt' as NoteSortBy,
  sortDirection: 'desc' as NoteSortDirection,
})

describe('NotesToolbar', () => {
  beforeEach(() => {
    globalThis.IntersectionObserver =
      IntersectionObserverMock as unknown as typeof IntersectionObserver
    globalThis.ResizeObserver =
      ResizeObserverMock as unknown as typeof ResizeObserver
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

  it('positions the sticky toolbar below the title bar and app bar', () => {
    render(<NotesToolbar {...createProps()} />)

    act(() => {
      intersectionObserverCallback(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver
      )
    })

    const stickyToolbarClass = screen
      .getByTestId('notes-toolbar-shell')
      .className.split(' ')
      .find((className) => className.startsWith('css-'))
    const generatedCss = Array.from(document.styleSheets)
      .flatMap((styleSheet) => Array.from(styleSheet.cssRules))
      .map((rule) => rule.cssText)
      .join(' ')

    expect(stickyToolbarClass).toBeTruthy()
    expect(generatedCss).toContain(
      `.${stickyToolbarClass} { top: calc(${56 + windowTitleBarHeight}px)`
    )
    expect(generatedCss).toContain(
      `.${stickyToolbarClass} { top: calc(${64 + windowTitleBarHeight}px)`
    )
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
  it('selects labels, changes match mode, and shows the combined filter count', () => {
    const props = createProps()
    const { rerender } = render(<NotesToolbar {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Favorite' }))
    fireEvent.click(
      screen.getByRole('button', { name: 'All selected labels (AND)' })
    )

    expect(props.onLabelIdsChange).toHaveBeenCalledWith(['label-1'])
    expect(props.onLabelMatchModeChange).toHaveBeenCalledWith('and')

    rerender(
      <NotesToolbar
        {...props}
        selectedLabelIds={['label-1']}
        selectedNoteTypeIds={['note-type-1']}
      />
    )

    expect(screen.getByText('Active filters')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.getByRole('button', { name: 'Filters (2)' })).toBeTruthy()
  })

  it('clears note-template and label filters together', () => {
    const props = {
      ...createProps(),
      selectedLabelIds: ['label-1'],
      selectedNoteTypeIds: ['note-type-1'],
    }
    render(<NotesToolbar {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Filters (2)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }))

    expect(props.onLabelIdsChange).toHaveBeenCalledWith([])
    expect(props.onNoteTypeIdsChange).toHaveBeenCalledWith([])
  })
})
