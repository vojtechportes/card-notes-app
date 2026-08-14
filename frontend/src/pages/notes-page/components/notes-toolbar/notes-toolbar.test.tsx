import {
  act,
  cleanup,
  fireEvent,
  render as testingLibraryRender,
  screen,
} from '@testing-library/react'
import { ThemeProvider } from '@mui/material'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PropsWithChildren, ReactNode } from 'react'
import { windowTitleBarHeight } from '../../../../constants/window-title-bar'
import { theme } from '../../../../theme'
import '../../../../i18n'
import { NotesToolbar } from './notes-toolbar'
import type { NoteSortBy, NoteSortDirection } from './notes-toolbar'

let intersectionObserverCallback: IntersectionObserverCallback
let resizeObserverCallback: ResizeObserverCallback

const render = (ui: ReactNode) =>
  testingLibraryRender(ui, {
    wrapper: ({ children }: PropsWithChildren) => (
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    ),
  })

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
  constructor(callback: ResizeObserverCallback) {
    resizeObserverCallback = callback
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
  onClearFilters: vi.fn(),
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
  viewMode: 'card' as const,
})

describe('NotesToolbar', () => {
  beforeEach(() => {
    globalThis.IntersectionObserver =
      IntersectionObserverMock as unknown as typeof IntersectionObserver
    globalThis.ResizeObserver =
      ResizeObserverMock as unknown as typeof ResizeObserver
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    }))
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
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
    expect(screen.getByLabelText('Sort by')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Filters' })).toBeTruthy()
    expect(generatedCss).toContain(
      `.${stickyToolbarClass} { top: calc(${56 + windowTitleBarHeight}px)`
    )
    expect(generatedCss).toContain(
      `.${stickyToolbarClass} { top: calc(${64 + windowTitleBarHeight}px)`
    )
  })
  it('uses the 1060px responsive layout for the non-sticky toolbar', () => {
    render(<NotesToolbar {...createProps()} />)

    const actionsClass = screen
      .getByTestId('notes-toolbar-actions')
      .className.split(' ')
      .find((className) => className.startsWith('css-'))
    const generatedCss = Array.from(document.styleSheets)
      .flatMap((styleSheet) => Array.from(styleSheet.cssRules))
      .map((rule) => rule.cssText)
      .join(' ')

    expect(actionsClass).toBeTruthy()
    expect(generatedCss).toContain('min-width:600px')
    expect(generatedCss).toContain('width > 1060px')
    expect(generatedCss).toContain('grid-template-columns: minmax(0, 1fr) auto')
  })

  it('keeps only search and add note in the compact sticky toolbar', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: query.includes('width <= 1060px'),
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    }))
    render(<NotesToolbar {...createProps()} />)

    expect(
      screen
        .getByTestId('notes-toolbar-content')
        .classList.contains('MuiContainer-disableGutters')
    ).toBe(true)

    act(() => {
      intersectionObserverCallback(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver
      )
    })

    expect(screen.getByRole('textbox', { name: 'Search notes' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add note' })).toBeTruthy()
    expect(screen.queryByLabelText('Sort by')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Ascending' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Filters' })).toBeNull()
    expect(
      screen
        .getByTestId('notes-toolbar-content')
        .classList.contains('MuiContainer-disableGutters')
    ).toBe(false)
  })

  it('restores sticky toolbar width after narrowing and widening', () => {
    render(
      <main>
        <NotesToolbar {...createProps()} />
      </main>
    )

    const main = screen.getByTestId('notes-toolbar-shell').closest('main')
    const wrapper = screen.getByTestId('notes-toolbar-shell').parentElement

    expect(main).toBeTruthy()
    expect(wrapper).toBeTruthy()

    vi.spyOn(main as HTMLElement, 'getBoundingClientRect').mockReturnValue({
      bottom: 800,
      height: 800,
      left: 248,
      right: 948,
      toJSON: () => ({}),
      top: 0,
      width: 700,
      x: 248,
      y: 0,
    })
    const mainOffsetWidth = vi
      .spyOn(main as HTMLElement, 'offsetWidth', 'get')
      .mockReturnValue(700)
    const mainClientWidth = vi
      .spyOn(main as HTMLElement, 'clientWidth', 'get')
      .mockReturnValue(685)
    vi.spyOn(wrapper as HTMLElement, 'getBoundingClientRect').mockReturnValue({
      bottom: 160,
      height: 96,
      left: 272,
      right: 924,
      toJSON: () => ({}),
      top: 64,
      width: 652,
      x: 272,
      y: 64,
    })

    act(() => {
      resizeObserverCallback([], {} as ResizeObserver)
      intersectionObserverCallback(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver
      )
    })

    let stickyToolbarClass = screen
      .getByTestId('notes-toolbar-shell')
      .className.split(' ')
      .find((className) => className.startsWith('css-'))
    let generatedCss = Array.from(document.styleSheets)
      .flatMap((styleSheet) => Array.from(styleSheet.cssRules))
      .map((rule) => rule.cssText)
      .join(' ')

    expect(generatedCss).toContain(`.${stickyToolbarClass} { position: fixed;`)
    expect(generatedCss).toContain('left: 248px')
    expect(generatedCss).toContain('width: 685px')

    vi.mocked((main as HTMLElement).getBoundingClientRect).mockReturnValue({
      bottom: 800,
      height: 800,
      left: 0,
      right: 950,
      toJSON: () => ({}),
      top: 0,
      width: 950,
      x: 0,
      y: 0,
    })
    mainOffsetWidth.mockReturnValue(950)
    mainClientWidth.mockReturnValue(950)
    vi.mocked((wrapper as HTMLElement).getBoundingClientRect).mockReturnValue({
      bottom: 160,
      height: 96,
      left: 24,
      right: 926,
      toJSON: () => ({}),
      top: 64,
      width: 902,
      x: 24,
      y: 64,
    })

    act(() => {
      resizeObserverCallback([], {} as ResizeObserver)
    })

    stickyToolbarClass = screen
      .getByTestId('notes-toolbar-shell')
      .className.split(' ')
      .find((className) => className.startsWith('css-'))
    generatedCss = Array.from(document.styleSheets)
      .flatMap((styleSheet) => Array.from(styleSheet.cssRules))
      .map((rule) => rule.cssText)
      .join(' ')

    expect(generatedCss).toContain(`.${stickyToolbarClass} { position: fixed;`)
    expect(generatedCss).toContain('left: 0')
    expect(generatedCss).toContain('width: 950px')
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

    expect(props.onClearFilters).toHaveBeenCalledTimes(1)
  })

  it('uses a required radio selection and label-only clear semantics in Data Grid view', () => {
    const props = {
      ...createProps(),
      selectedLabelIds: ['label-1'],
      selectedNoteTypeIds: ['note-type-1'],
      viewMode: 'data-grid' as const,
    }
    render(<NotesToolbar {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Filters (1)' }))

    expect(
      screen.getByRole('radiogroup', { name: 'Data Grid note template' })
    ).toBeTruthy()
    expect(screen.queryByRole('checkbox', { name: 'Books' })).toBeNull()
    expect(
      (screen.getByRole('radio', { name: 'Books' }) as HTMLInputElement).checked
    ).toBe(true)
    expect(screen.getByText('Active filters')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }))

    expect(props.onClearFilters).toHaveBeenCalledTimes(1)
    expect(props.onNoteTypeIdsChange).not.toHaveBeenCalled()
  })

  it('selects exactly one note template in Data Grid view', () => {
    const props = {
      ...createProps(),
      noteTypes: [
        ...createProps().noteTypes,
        {
          createdAt: '2026-07-07T10:00:00.000Z',
          id: 'note-type-2',
          title: 'Movies',
          updatedAt: '2026-07-07T10:00:00.000Z',
        },
      ],
      selectedNoteTypeIds: ['note-type-1'],
      viewMode: 'data-grid' as const,
    }
    render(<NotesToolbar {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Movies' }))

    expect(props.onNoteTypeIdsChange).toHaveBeenCalledWith(['note-type-2'])
  })
})
