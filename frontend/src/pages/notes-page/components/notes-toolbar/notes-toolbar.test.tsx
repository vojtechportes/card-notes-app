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
})
