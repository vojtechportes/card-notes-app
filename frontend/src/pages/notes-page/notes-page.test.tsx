import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { AppProviders } from '../../components/app-providers/app-providers'
import { SideDrawer, SideDrawerProvider } from '../../components/side-drawer'
import type { ColumnDto, GeneralSettingsDto, NoteDto } from '../../types/api'
import '../../i18n'
import { NotesPage } from './notes-page'

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

globalThis.ResizeObserver =
  ResizeObserverMock as unknown as typeof ResizeObserver
globalThis.IntersectionObserver =
  IntersectionObserverMock as unknown as typeof IntersectionObserver

const useCreateNoteMutationMock = vi.hoisted(() => vi.fn())
const useDeleteNoteMutationMock = vi.hoisted(() => vi.fn())
const useGeneralSettingsQueryMock = vi.hoisted(() => vi.fn())
const useNoteColumnsQueryMock = vi.hoisted(() => vi.fn())
const useNoteTypeColumnsMapQueryMock = vi.hoisted(() => vi.fn())
const useNotesQueryMock = vi.hoisted(() => vi.fn())
const useNotesSearchMock = vi.hoisted(() => vi.fn())
const useUpdateNoteMutationMock = vi.hoisted(() => vi.fn())

vi.mock('./hooks/use-general-settings-query', () => ({
  useGeneralSettingsQuery: useGeneralSettingsQueryMock,
}))

vi.mock('./hooks/use-note-columns-query', () => ({
  useNoteColumnsQuery: useNoteColumnsQueryMock,
}))

vi.mock('./hooks/use-note-type-columns-map-query', () => ({
  useNoteTypeColumnsMapQuery: useNoteTypeColumnsMapQueryMock,
}))

vi.mock('./hooks/use-notes-query', () => ({
  useCreateNoteMutation: useCreateNoteMutationMock,
  useDeleteNoteMutation: useDeleteNoteMutationMock,
  useNotesQuery: useNotesQueryMock,
  useUpdateNoteMutation: useUpdateNoteMutationMock,
}))

vi.mock('./hooks/use-notes-search', () => ({
  useNotesSearch: useNotesSearchMock,
}))

const columns: ColumnDto[] = [
  {
    config: null,
    createdAt: '2026-07-07T10:00:00.000Z',
    id: 'created-column',
    noteTypeId: 'note-type-1',
    isDefault: true,
    isHidden: true,
    name: 'createdAt',
    sortOrder: 0,
    title: 'Created at',
    type: 'date',
    updatedAt: '2026-07-07T10:00:00.000Z',
  },
  {
    config: null,
    createdAt: '2026-07-07T10:00:00.000Z',
    id: 'updated-column',
    noteTypeId: 'note-type-1',
    isDefault: true,
    isHidden: true,
    name: 'updatedAt',
    sortOrder: 1,
    title: 'Updated at',
    type: 'date',
    updatedAt: '2026-07-07T10:00:00.000Z',
  },
  {
    config: null,
    createdAt: '2026-07-07T10:00:00.000Z',
    id: 'title-column',
    noteTypeId: 'note-type-1',
    isDefault: false,
    isHidden: false,
    name: 'title',
    sortOrder: 2,
    title: 'Title',
    type: 'text',
    updatedAt: '2026-07-07T10:00:00.000Z',
  },
  {
    config: null,
    createdAt: '2026-07-07T10:00:00.000Z',
    id: 'summary-column',
    noteTypeId: 'note-type-1',
    isDefault: false,
    isHidden: false,
    name: 'summary',
    sortOrder: 3,
    title: 'Summary',
    type: 'text',
    updatedAt: '2026-07-07T10:00:00.000Z',
  },
  {
    config: null,
    createdAt: '2026-07-07T10:00:00.000Z',
    id: 'link-column',
    noteTypeId: 'note-type-1',
    isDefault: false,
    isHidden: false,
    name: 'referenceLink',
    sortOrder: 4,
    title: 'Reference link',
    type: 'link',
    updatedAt: '2026-07-07T10:00:00.000Z',
  },
  {
    config: null,
    createdAt: '2026-07-07T10:00:00.000Z',
    id: 'image-column',
    noteTypeId: 'note-type-1',
    isDefault: false,
    isHidden: false,
    name: 'image',
    sortOrder: 5,
    title: 'Image',
    type: 'image',
    updatedAt: '2026-07-07T10:00:00.000Z',
  },
]

const generalSettings: GeneralSettingsDto = {
  cardFieldDisplayCount: null,
  textTruncationLength: null,
  mergeDateTimeFields: null,
}

const notes: NoteDto[] = [
  {
    createdAt: '2026-07-07T10:00:00.000Z',
    id: 'note-1',
    noteTypeId: 'note-type-1',
    updatedAt: '2026-07-07T12:00:00.000Z',
    values: {
      'image-column': {
        altText: 'Alpha note image',
        dataUrl: 'data:image/png;base64,ZmFrZQ==',
        fileName: 'alpha-note.png',
        mimeType: 'image/png',
      },
      'link-column': 'https://example.com/alpha',
      'title-column': 'Alpha note',
    },
  },
]

const secondNote: NoteDto = {
  createdAt: '2026-07-07T11:00:00.000Z',
  id: 'note-2',
  noteTypeId: 'note-type-1',
  updatedAt: '2026-07-07T13:00:00.000Z',
  values: { 'title-column': 'Beta note' },
}

const renderNotesPage = (route = '#/notes') => {
  window.location.hash = route

  return render(
    <AppProviders>
      <SideDrawerProvider>
        <Routes>
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/notes/:noteId" element={<NotesPage />} />
        </Routes>
        <SideDrawer />
      </SideDrawerProvider>
    </AppProviders>
  )
}

const getRenderedSideDrawer = async () => {
  await waitFor(() => {
    expect(document.querySelector('[data-test-name="side-drawer"]')).not.toBeNull()
  })

  const sideDrawer = document.querySelector(
    '[data-test-name="side-drawer"]'
  ) as HTMLElement | null

  if (!sideDrawer) {
    throw new Error('Expected side drawer to be rendered.')
  }

  return sideDrawer
}

describe('NotesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.location.hash = '#/notes'
    useCreateNoteMutationMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    })
    useDeleteNoteMutationMock.mockReturnValue({
      isPending: false,
      mutate: vi.fn(),
    })
    useGeneralSettingsQueryMock.mockReturnValue({
      data: generalSettings,
      isError: false,
      isLoading: false,
    })
    useNoteColumnsQueryMock.mockReturnValue({
      data: columns,
      isError: false,
      isLoading: false,
    })
    useNoteTypeColumnsMapQueryMock.mockReturnValue({
      data: { 'note-type-1': columns },
      isError: false,
      isLoading: false,
    })
    useNotesQueryMock.mockReturnValue({
      data: notes,
      isError: false,
      isLoading: false,
    })
    useNotesSearchMock.mockReturnValue(notes)
    useUpdateNoteMutationMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    })
  })

  afterEach(() => {
    cleanup()
    window.location.hash = ''
  })

  it('fetches notes with the default toolbar sort state', () => {
    renderNotesPage()

    expect(useNotesQueryMock).toHaveBeenCalledWith({
      sortBy: 'updatedAt',
      sortDirection: 'desc',
    })
  })

  it('passes loaded notes and search text to the notes search hook', () => {
    renderNotesPage()

    fireEvent.change(screen.getByRole('textbox', { name: 'Search notes' }), {
      target: { value: 'alpha' },
    })

    expect(useNotesSearchMock).toHaveBeenLastCalledWith(notes, 'alpha')
  })

  it('renders the visible notes count with plural copy', () => {
    useNotesSearchMock.mockReturnValue([notes[0], secondNote])

    renderNotesPage()

    expect(screen.getByText('2 visible notes')).toBeTruthy()
  })

  it('updates the notes query sort state from the toolbar', () => {
    renderNotesPage()

    fireEvent.change(screen.getByLabelText('Sort by'), {
      target: { value: 'createdAt' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Ascending' }))

    expect(useNotesQueryMock).toHaveBeenLastCalledWith({
      sortBy: 'createdAt',
      sortDirection: 'asc',
    })
  })

  it('renders note cards instead of the placeholder preview cards', () => {
    renderNotesPage()

    expect(screen.getByText('Alpha note')).toBeTruthy()
    expect(screen.queryByText('Structured fields')).toBeNull()
  })

  it('shows a card configuration error when note columns or general settings fail to load', () => {
    useGeneralSettingsQueryMock.mockReturnValue({
      data: undefined,
      isError: true,
      isLoading: false,
    })

    renderNotesPage()

    expect(
      screen.getByText('Card configuration could not be loaded.')
    ).toBeTruthy()
    expect(screen.queryByText('Alpha note')).toBeNull()
  })

  it('opens and closes the create note dialog from the toolbar action', async () => {
    renderNotesPage()

    fireEvent.click(screen.getByRole('button', { name: 'Add note' }))

    expect(screen.getByRole('dialog', { name: 'Create note' })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Title' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Create note' })).toBeNull()
    })
  })

  it('opens the edit dialog from a note card with the existing note values', () => {
    renderNotesPage()

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

    expect(screen.getByRole('dialog', { name: 'Edit note' })).toBeTruthy()
    expect(
      (screen.getByRole('textbox', { name: 'Title' }) as HTMLInputElement).value
    ).toBe('Alpha note')
  })

  it('renders the delete action for note cards', () => {
    renderNotesPage()

    expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy()
  })

  it('opens and renders the note detail drawer from the card action', async () => {
    renderNotesPage()

    fireEvent.click(screen.getByRole('button', { name: 'Open detail' }))

    await waitFor(() => expect(window.location.hash).toBe('#/notes/note-1'))

    const sideDrawer = await getRenderedSideDrawer()

    expect(screen.getByText('Note detail')).toBeTruthy()
    expect(screen.getByText('Created at')).toBeTruthy()
    expect(screen.getByText('Updated at')).toBeTruthy()
    expect(screen.getByText('Summary')).toBeTruthy()
    expect(screen.getByText('-')).toBeTruthy()
    expect(
      within(sideDrawer).getByRole('link', {
        name: 'https://example.com/alpha',
      })
    ).toBeTruthy()
    expect(
      within(sideDrawer).getByRole('img', { name: 'Alpha note image' })
    ).toBeTruthy()
  })

  it('does not open the note detail drawer while note-type columns are still loading', async () => {
    useNoteTypeColumnsMapQueryMock.mockReturnValue({
      data: {},
      isError: false,
      isLoading: true,
    })

    renderNotesPage('#/notes/note-1')

    expect(screen.getByText('Loading notes...')).toBeTruthy()

    await waitFor(() => {
      expect(document.querySelector('[data-test-name="side-drawer"]')).toBeNull()
    })
  })

  it('does not open the note detail drawer when note-type columns fail to load', async () => {
    useNoteTypeColumnsMapQueryMock.mockReturnValue({
      data: {},
      isError: true,
      isLoading: false,
    })

    renderNotesPage('#/notes/note-1')

    expect(
      screen.getByText('Card configuration could not be loaded.')
    ).toBeTruthy()

    await waitFor(() => {
      expect(document.querySelector('[data-test-name="side-drawer"]')).toBeNull()
    })
  })
  it('opens the note detail drawer when the note id is already in the route', async () => {
    renderNotesPage('#/notes/note-1')

    const sideDrawer = await getRenderedSideDrawer()

    expect(within(sideDrawer).getByText('Alpha note')).toBeTruthy()
  })

  it('merges created and updated timestamps in the detail drawer when enabled', async () => {
    useGeneralSettingsQueryMock.mockReturnValue({
      data: {
        ...generalSettings,
        mergeDateTimeFields: true,
      },
      isError: false,
      isLoading: false,
    })

    renderNotesPage('#/notes/note-1')

    await getRenderedSideDrawer()

    expect(screen.getByText('Last updated at')).toBeTruthy()
    expect(screen.queryByText('Created at')).toBeNull()
    expect(screen.queryByText('Updated at')).toBeNull()
  })

  it('does not open the note detail drawer from the card edit action', () => {
    renderNotesPage()

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

    expect(document.querySelector('[data-test-name="side-drawer"]')).toBeNull()
    expect(screen.getByRole('dialog', { name: 'Edit note' })).toBeTruthy()
    expect(window.location.hash).toBe('#/notes')
  })

  it('does not open the note detail drawer from the card link action', () => {
    renderNotesPage()

    fireEvent.click(
      screen.getByRole('link', { name: 'https://example.com/alpha' })
    )

    expect(document.querySelector('[data-test-name="side-drawer"]')).toBeNull()
    expect(window.location.hash).toBe('#/notes')
  })

  it('updates the note detail drawer when switching between notes', async () => {
    useNotesQueryMock.mockReturnValue({
      data: [notes[0], secondNote],
      isError: false,
      isLoading: false,
    })
    useNotesSearchMock.mockReturnValue([notes[0], secondNote])

    renderNotesPage()

    fireEvent.click(screen.getAllByRole('button', { name: 'Open detail' })[0])

    await waitFor(() => expect(window.location.hash).toBe('#/notes/note-1'))

    let sideDrawer = await getRenderedSideDrawer()

    expect(within(sideDrawer).getByText('Alpha note')).toBeTruthy()

    fireEvent.click(screen.getAllByRole('button', { name: 'Open detail' })[1])

    await waitFor(() => expect(window.location.hash).toBe('#/notes/note-2'))

    sideDrawer = await getRenderedSideDrawer()

    expect(within(sideDrawer).getByText('Beta note')).toBeTruthy()
  })

  it('closes the note detail drawer from the close action', async () => {
    renderNotesPage('#/notes/note-1')

    await getRenderedSideDrawer()

    fireEvent.click(screen.getByRole('button', { name: 'Close detail' }))

    await waitFor(() => {
      expect(
        document.querySelector('[data-test-name="side-drawer"]')
      ).toBeNull()
    })
    expect(window.location.hash).toBe('#/notes')
  })

  it('normalizes an unknown note route back to the notes list', async () => {
    renderNotesPage('#/notes/missing-note')

    await waitFor(() => expect(window.location.hash).toBe('#/notes'))
    expect(document.querySelector('[data-test-name="side-drawer"]')).toBeNull()
  })

  it('opens the edit dialog from the note detail drawer', async () => {
    renderNotesPage('#/notes/note-1')

    const sideDrawer = await getRenderedSideDrawer()

    fireEvent.click(
      within(sideDrawer).getByRole('button', { name: 'Edit note' })
    )

    expect(screen.getByRole('dialog', { name: 'Edit note' })).toBeTruthy()
    expect(
      (screen.getByRole('textbox', { name: 'Title' }) as HTMLInputElement).value
    ).toBe('Alpha note')
  })

  it('opens and cancels the delete confirmation without calling the delete mutation', async () => {
    const deleteNoteMutation = {
      isPending: false,
      mutate: vi.fn(),
    }
    useDeleteNoteMutationMock.mockReturnValue(deleteNoteMutation)

    renderNotesPage()

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(document.querySelector('[data-test-name="side-drawer"]')).toBeNull()
    expect(
      await screen.findByRole('dialog', { name: 'Delete note?' })
    ).toBeTruthy()
    expect(
      screen.getByText('This note will be permanently removed.')
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Delete note?' })).toBeNull()
    })
    expect(deleteNoteMutation.mutate).not.toHaveBeenCalled()
  })

  it('confirms note deletion from the detail drawer, closes the route, and calls the delete mutation with the selected note id', async () => {
    const deleteNoteMutation = {
      isPending: false,
      mutate: vi.fn(),
    }
    useDeleteNoteMutationMock.mockReturnValue(deleteNoteMutation)

    renderNotesPage('#/notes/note-1')

    const sideDrawer = await getRenderedSideDrawer()

    fireEvent.click(
      within(sideDrawer).getByRole('button', { name: 'Delete note' })
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Delete note' }))

    await waitFor(() => {
      expect(deleteNoteMutation.mutate).toHaveBeenCalledWith('note-1')
    })
    expect(window.location.hash).toBe('#/notes')
  })
})

