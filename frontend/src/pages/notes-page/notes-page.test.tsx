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
import type {
  ColumnDto,
  GeneralSettingsDto,
  NoteDto,
  NoteTypeDto,
} from '../../types/api'
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
const useNoteTypesQueryMock = vi.hoisted(() => vi.fn())
const useNotesQueryMock = vi.hoisted(() => vi.fn())
const useNotesSearchMock = vi.hoisted(() => vi.fn())
const useUpdateNoteMutationMock = vi.hoisted(() => vi.fn())

vi.mock('../settings-page/hooks/use-note-types-query', () => ({
  useNoteTypesQuery: useNoteTypesQueryMock,
}))

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

const noteTypes: NoteTypeDto[] = [
  {
    createdAt: '2026-07-07T10:00:00.000Z',
    id: 'note-type-1',
    title: 'Books',
    updatedAt: '2026-07-07T10:00:00.000Z',
  },
  {
    createdAt: '2026-07-07T10:00:00.000Z',
    id: 'note-type-2',
    title: 'Movies',
    updatedAt: '2026-07-07T10:00:00.000Z',
  },
]

const bookColumns: ColumnDto[] = [
  {
    config: null,
    createdAt: '2026-07-07T10:00:00.000Z',
    id: 'book-created-column',
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
    id: 'book-updated-column',
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

const movieColumns: ColumnDto[] = [
  {
    config: null,
    createdAt: '2026-07-07T10:00:00.000Z',
    id: 'movie-created-column',
    noteTypeId: 'note-type-2',
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
    id: 'movie-updated-column',
    noteTypeId: 'note-type-2',
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
    id: 'director-column',
    noteTypeId: 'note-type-2',
    isDefault: false,
    isHidden: false,
    name: 'director',
    sortOrder: 2,
    title: 'Director',
    type: 'text',
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
      'summary-column': 'Alpha summary',
      'title-column': 'Alpha note',
    },
  },
  {
    createdAt: '2026-07-07T11:00:00.000Z',
    id: 'note-2',
    noteTypeId: 'note-type-2',
    updatedAt: '2026-07-07T13:00:00.000Z',
    values: {
      'director-column': 'Greta Gerwig',
    },
  },
]

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
    expect(
      document.querySelector('[data-test-name="side-drawer"]')
    ).not.toBeNull()
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
    useNoteColumnsQueryMock.mockImplementation((noteTypeId?: string) => ({
      data:
        noteTypeId === 'note-type-2'
          ? movieColumns
          : noteTypeId === 'note-type-1'
            ? bookColumns
            : undefined,
      isError: false,
      isLoading: false,
    }))
    useNoteTypeColumnsMapQueryMock.mockReturnValue({
      data: {
        'note-type-1': bookColumns,
        'note-type-2': movieColumns,
      },
      isError: false,
      isLoading: false,
    })
    useNoteTypesQueryMock.mockReturnValue({
      data: noteTypes,
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
      noteTypeIds: undefined,
      sortBy: 'updatedAt',
      sortDirection: 'desc',
    })
  })

  it('passes loaded notes, search text, and note template titles to the notes search hook', () => {
    renderNotesPage()

    fireEvent.change(screen.getByRole('textbox', { name: 'Search notes' }), {
      target: { value: 'alpha' },
    })

    expect(useNotesSearchMock).toHaveBeenLastCalledWith(notes, 'alpha', {
      'note-type-1': 'Books',
      'note-type-2': 'Movies',
    })
  })

  it('updates the notes query sort state from the toolbar', () => {
    renderNotesPage()

    fireEvent.change(screen.getByLabelText('Sort by'), {
      target: { value: 'createdAt' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Ascending' }))

    expect(useNotesQueryMock).toHaveBeenLastCalledWith({
      noteTypeIds: undefined,
      sortBy: 'createdAt',
      sortDirection: 'asc',
    })
  })

  it('passes selected note template filters into the notes query', () => {
    renderNotesPage()

    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Books' }))

    expect(useNotesQueryMock).toHaveBeenLastCalledWith({
      noteTypeIds: ['note-type-1'],
      sortBy: 'updatedAt',
      sortDirection: 'desc',
    })
  })

  it('renders mixed note cards without note template labels in the list', () => {
    renderNotesPage()

    expect(screen.getByText('Alpha note')).toBeTruthy()
    expect(screen.getByText('Greta Gerwig')).toBeTruthy()
    expect(screen.queryByText('Books')).toBeNull()
    expect(screen.queryByText('Movies')).toBeNull()
  })

  it('opens the create note dialog with note template selection first', async () => {
    renderNotesPage()

    fireEvent.click(screen.getByRole('button', { name: 'Add note' }))

    expect(screen.getByRole('dialog', { name: 'Create note' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Note template' })).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: 'Title' })).toBeNull()

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Note template' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Books' }))

    expect(screen.getByRole('textbox', { name: 'Title' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Create note' })).toBeNull()
    })
  })

  it('opens the edit dialog from a note card with a fixed note template and existing values', async () => {
    renderNotesPage()

    fireEvent.click(screen.getAllByRole('button', { name: 'More actions' })[0])
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }))

    expect(screen.getByRole('dialog', { name: 'Edit note' })).toBeTruthy()
    expect(
      screen
        .getByRole('combobox', { name: 'Note template' })
        .getAttribute('aria-disabled')
    ).toBe('true')
    expect(
      (screen.getByRole('textbox', { name: 'Title' }) as HTMLInputElement).value
    ).toBe('Alpha note')
  })

  it('opens and renders the note detail drawer with note template as a regular detail row', async () => {
    renderNotesPage()

    fireEvent.click(
      screen.getAllByRole('button', { name: /Open detail for/i })[0]
    )

    await waitFor(() => expect(window.location.hash).toBe('#/notes/note-1'))

    const sideDrawer = await getRenderedSideDrawer()

    expect(within(sideDrawer).getByText('Note template')).toBeTruthy()
    expect(within(sideDrawer).getByText('Books')).toBeTruthy()
    expect(within(sideDrawer).getByText('Summary')).toBeTruthy()
    expect(within(sideDrawer).getByText('Alpha summary')).toBeTruthy()
    expect(
      within(sideDrawer).getByRole('link', {
        name: 'https://example.com/alpha',
      })
    ).toBeTruthy()
    expect(
      within(sideDrawer).getByRole('img', { name: 'Alpha note image' })
    ).toBeTruthy()

    fireEvent.click(
      within(sideDrawer).getByRole('button', { name: 'Alpha note image' })
    )

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Close image preview' })
      ).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Close image preview' }))

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Close image preview' })
      ).toBeNull()
    })
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

  it('does not open the note detail drawer while note-type columns are still loading', async () => {
    useNoteTypeColumnsMapQueryMock.mockReturnValue({
      data: {},
      isError: false,
      isLoading: true,
    })

    renderNotesPage('#/notes/note-1')

    expect(screen.getByText('Loading notes...')).toBeTruthy()

    await waitFor(() => {
      expect(
        document.querySelector('[data-test-name="side-drawer"]')
      ).toBeNull()
    })
  })

  it('opens the edit dialog from the detail drawer overflow menu', async () => {
    renderNotesPage('#/notes/note-1')

    const sideDrawer = await getRenderedSideDrawer()

    fireEvent.click(
      within(sideDrawer).getByRole('button', { name: 'More actions' })
    )
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Edit note' }))

    expect(screen.getByRole('dialog', { name: 'Edit note' })).toBeTruthy()
    expect(
      (screen.getByRole('textbox', { name: 'Title' }) as HTMLInputElement).value
    ).toBe('Alpha note')
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

  it('opens and cancels the delete confirmation without calling the delete mutation', async () => {
    const deleteNoteMutation = {
      isPending: false,
      mutate: vi.fn(),
    }
    useDeleteNoteMutationMock.mockReturnValue(deleteNoteMutation)

    renderNotesPage()

    fireEvent.click(screen.getAllByRole('button', { name: 'More actions' })[0])
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }))

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

  it('confirms note deletion from the detail drawer and calls the delete mutation with the selected note id', async () => {
    const deleteNoteMutation = {
      isPending: false,
      mutate: vi.fn(),
    }
    useDeleteNoteMutationMock.mockReturnValue(deleteNoteMutation)

    renderNotesPage('#/notes/note-1')

    const sideDrawer = await getRenderedSideDrawer()

    fireEvent.click(
      within(sideDrawer).getByRole('button', { name: 'More actions' })
    )
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Delete note' })
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Delete note' }))

    await waitFor(() => {
      expect(deleteNoteMutation.mutate).toHaveBeenCalledWith('note-1')
    })
    expect(window.location.hash).toBe('#/notes')
  })

  it('normalizes an unknown note route back to the notes list', async () => {
    renderNotesPage('#/notes/missing-note')

    await waitFor(() => expect(window.location.hash).toBe('#/notes'))
    expect(document.querySelector('[data-test-name="side-drawer"]')).toBeNull()
  })
})
