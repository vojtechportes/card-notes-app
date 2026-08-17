import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppProviders } from '../../components/app-providers/app-providers'
import {
  SideDrawer,
  SideDrawerContext,
  SideDrawerProvider,
  drawerInitialState,
} from '../../components/side-drawer'
import type {
  ColumnDto,
  GeneralSettingsDto,
  LabelDto,
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
const useLabelsQueryMock = vi.hoisted(() => vi.fn())
const useNoteColumnsQueryMock = vi.hoisted(() => vi.fn())
const useNoteTypeColumnsMapQueryMock = vi.hoisted(() => vi.fn())
const useNoteTypesQueryMock = vi.hoisted(() => vi.fn())
const useNotesQueryMock = vi.hoisted(() => vi.fn())
const useNotesSearchMock = vi.hoisted(() => vi.fn())
const useUpdateNoteBackgroundMutationMock = vi.hoisted(() => vi.fn())
const useUpdateNoteMutationMock = vi.hoisted(() => vi.fn())

vi.mock('../settings-page/hooks/use-labels-query', () => ({
  useLabelsQuery: useLabelsQueryMock,
}))

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
  useUpdateNoteBackgroundMutation: useUpdateNoteBackgroundMutationMock,
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
    isHiddenInDetail: false,
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
    isHiddenInDetail: false,
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
    isHiddenInDetail: false,
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
    isHiddenInDetail: false,
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
    isHiddenInDetail: false,
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
    isHiddenInDetail: false,
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
    isHiddenInDetail: false,
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
    isHiddenInDetail: false,
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
    isHiddenInDetail: false,
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
    background: null,
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
    background: null,
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
    window.localStorage.clear()
    window.location.hash = '#/notes'
    useCreateNoteMutationMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    })
    useDeleteNoteMutationMock.mockReturnValue({
      isPending: false,
      mutate: vi.fn(),
    })
    useLabelsQueryMock.mockReturnValue({
      data: [],
      isError: false,
      isLoading: false,
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
    useUpdateNoteBackgroundMutationMock.mockReturnValue({
      isPending: false,
      mutate: vi.fn(),
    })
    useUpdateNoteMutationMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    })
  })

  afterEach(() => {
    cleanup()
    window.location.hash = ''
    window.localStorage.clear()
  })

  it('fetches notes with the default toolbar sort state', () => {
    renderNotesPage()

    expect(useNotesQueryMock).toHaveBeenLastCalledWith(
      {
        noteTypeIds: undefined,
        sortBy: 'updatedAt',
        sortDirection: 'desc',
      },
      { enabled: true }
    )
  })

  it('keeps selected-template cards available when unrelated columns fail', async () => {
    window.localStorage.setItem(
      'notestack.notes.view-preferences',
      JSON.stringify({
        version: 1,
        viewMode: 'card',
        card: {
          labelIds: [],
          labelMatchMode: 'or',
          noteTypeIds: ['note-type-1'],
        },
        dataGrid: {
          labelIds: [],
          labelMatchMode: 'or',
          noteTypeId: 'note-type-1',
        },
        dataGridColumnWidths: {},
      })
    )
    useNotesQueryMock.mockImplementation(({ noteTypeIds }) => ({
      data: noteTypeIds?.includes('note-type-1') ? [notes[0]] : notes,
      isError: false,
      isLoading: false,
    }))
    useNoteTypeColumnsMapQueryMock.mockImplementation((noteTypeIds) => {
      if (noteTypeIds.includes('note-type-2')) {
        return {
          data: {
            'note-type-1': bookColumns,
          },
          isError: true,
          isLoading: false,
          isSuccess: false,
        }
      }

      return {
        data: {
          'note-type-1': bookColumns,
        },
        isError: false,
        isLoading: false,
        isSuccess: true,
      }
    })
    useNotesSearchMock.mockImplementation((visibleNotes) => visibleNotes)

    renderNotesPage()

    await waitFor(() => {
      expect(screen.getByText('Alpha note')).toBeTruthy()
    })
    expect(
      screen.queryByText('Card configuration could not be loaded.')
    ).toBeNull()
  })

  it('passes loaded notes, search text, and note template titles to the notes search hook', () => {
    renderNotesPage()

    fireEvent.change(screen.getByRole('textbox', { name: 'Search notes' }), {
      target: { value: 'alpha' },
    })

    expect(useNotesSearchMock).toHaveBeenLastCalledWith(
      notes,
      'alpha',
      {
        'note-type-1': 'Books',
        'note-type-2': 'Movies',
      },
      []
    )
  })

  it('updates the notes query sort state from the toolbar', () => {
    renderNotesPage()

    fireEvent.change(screen.getByLabelText('Sort by'), {
      target: { value: 'createdAt' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Ascending' }))

    expect(useNotesQueryMock).toHaveBeenLastCalledWith(
      {
        noteTypeIds: undefined,
        sortBy: 'createdAt',
        sortDirection: 'asc',
      },
      { enabled: true }
    )
  })

  it('passes selected note template filters into the notes query', () => {
    renderNotesPage()

    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Books' }))

    expect(useNotesQueryMock).toHaveBeenLastCalledWith(
      {
        noteTypeIds: ['note-type-1'],
        sortBy: 'updatedAt',
        sortDirection: 'desc',
      },
      { enabled: true }
    )
  })

  it('filters notes by labels before applying text search', () => {
    const labels: LabelDto[] = [
      {
        color: '#0070F2',
        createdAt: '2026-07-07T10:00:00.000Z',
        id: 'label-1',
        name: 'favorite',
        noteTypeId: null,
        title: 'Favorite',
        updatedAt: '2026-07-07T10:00:00.000Z',
      },
    ]
    const labelColumn: ColumnDto = {
      config: null,
      createdAt: '2026-07-07T10:00:00.000Z',
      id: 'labels-column',
      isDefault: false,
      isHidden: false,
      isHiddenInDetail: false,
      name: 'labels',
      noteTypeId: 'note-type-1',
      sortOrder: 6,
      title: 'Labels',
      type: 'labels',
      updatedAt: '2026-07-07T10:00:00.000Z',
    }
    const notesWithLabels = [
      {
        ...notes[0],
        values: { ...notes[0].values, 'labels-column': ['label-1'] },
      },
      notes[1],
    ]
    useLabelsQueryMock.mockReturnValue({
      data: labels,
      isError: false,
      isLoading: false,
    })
    useNotesQueryMock.mockReturnValue({
      data: notesWithLabels,
      isError: false,
      isLoading: false,
    })
    useNoteTypeColumnsMapQueryMock.mockReturnValue({
      data: {
        'note-type-1': [...bookColumns, labelColumn],
        'note-type-2': movieColumns,
      },
      isError: false,
      isLoading: false,
    })
    useNotesSearchMock.mockImplementation((filteredNotes) => filteredNotes)

    renderNotesPage()

    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Favorite' }))

    expect(useNotesSearchMock).toHaveBeenLastCalledWith(
      [notesWithLabels[0]],
      '',
      {
        'note-type-1': 'Books',
        'note-type-2': 'Movies',
      },
      labels
    )
    expect(useNotesQueryMock).toHaveBeenLastCalledWith(
      {
        noteTypeIds: undefined,
        sortBy: 'updatedAt',
        sortDirection: 'desc',
      },
      { enabled: true }
    )
  })
  it('combines note template and label filters before applying text search', () => {
    const labels: LabelDto[] = [
      {
        color: '#0070F2',
        createdAt: '2026-07-07T10:00:00.000Z',
        id: 'label-1',
        name: 'favorite',
        noteTypeId: null,
        title: 'Favorite',
        updatedAt: '2026-07-07T10:00:00.000Z',
      },
    ]
    const labelColumn: ColumnDto = {
      config: null,
      createdAt: '2026-07-07T10:00:00.000Z',
      id: 'labels-column',
      isDefault: false,
      isHidden: false,
      isHiddenInDetail: false,
      name: 'labels',
      noteTypeId: 'note-type-1',
      sortOrder: 6,
      title: 'Labels',
      type: 'labels',
      updatedAt: '2026-07-07T10:00:00.000Z',
    }
    const filteredBook = {
      ...notes[0],
      values: { ...notes[0].values, 'labels-column': ['label-1'] },
    }
    useLabelsQueryMock.mockReturnValue({
      data: labels,
      isError: false,
      isLoading: false,
    })
    useNotesQueryMock.mockReturnValue({
      data: [filteredBook],
      isError: false,
      isLoading: false,
    })
    useNoteTypeColumnsMapQueryMock.mockReturnValue({
      data: {
        'note-type-1': [...bookColumns, labelColumn],
        'note-type-2': movieColumns,
      },
      isError: false,
      isLoading: false,
    })
    useNotesSearchMock.mockImplementation((filteredNotes) => filteredNotes)

    renderNotesPage()

    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Books' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Favorite' }))

    expect(useNotesQueryMock).toHaveBeenLastCalledWith(
      {
        noteTypeIds: ['note-type-1'],
        sortBy: 'updatedAt',
        sortDirection: 'desc',
      },
      { enabled: true }
    )
    expect(useNotesSearchMock).toHaveBeenLastCalledWith(
      [filteredBook],
      '',
      {
        'note-type-1': 'Books',
        'note-type-2': 'Movies',
      },
      labels
    )
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

  it('does not reopen the drawer when hook result objects change identity', async () => {
    const deleteNote = vi.fn()
    const toggleDrawer = vi.fn()

    useDeleteNoteMutationMock.mockImplementation(() => ({
      isPending: false,
      mutate: deleteNote,
    }))
    useNoteTypeColumnsMapQueryMock.mockImplementation(() => ({
      data: {
        'note-type-1': bookColumns,
        'note-type-2': movieColumns,
      },
      isError: false,
      isLoading: false,
    }))

    const RerenderHarness = () => {
      const [, setRenderCount] = useState(0)

      return (
        <SideDrawerContext.Provider
          value={{ sideDrawerInfo: drawerInitialState, toggleDrawer }}
        >
          <button
            type="button"
            onClick={() => {
              setRenderCount((currentCount) => currentCount + 1)
            }}
          >
            Rerender notes page
          </button>
          <Routes>
            <Route path="/notes/:noteId" element={<NotesPage />} />
          </Routes>
        </SideDrawerContext.Provider>
      )
    }

    window.location.hash = '#/notes/note-1'
    render(
      <AppProviders>
        <RerenderHarness />
      </AppProviders>
    )

    await waitFor(() => {
      expect(toggleDrawer).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Rerender notes page' }))

    expect(toggleDrawer).toHaveBeenCalledTimes(1)
  })
  it('merges created and updated timestamps in the detail drawer when enabled', async () => {
    useLabelsQueryMock.mockReturnValue({
      data: [],
      isError: false,
      isLoading: false,
    })
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
    useLabelsQueryMock.mockReturnValue({
      data: [],
      isError: false,
      isLoading: false,
    })
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
  it('updates the note background from the detail drawer nested menu', async () => {
    const updateBackground = vi.fn()
    useUpdateNoteBackgroundMutationMock.mockReturnValue({
      isPending: false,
      mutate: updateBackground,
    })
    renderNotesPage('#/notes/note-1')

    const sideDrawer = await getRenderedSideDrawer()

    fireEvent.click(
      within(sideDrawer).getByRole('button', { name: 'More actions' })
    )
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Background options' })
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Sky' }))

    expect(updateBackground).toHaveBeenCalledWith({
      id: 'note-1',
      background: { background: 'SKY' },
    })
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

  it('switches views accessibly and persists every valid view change', async () => {
    useNoteTypeColumnsMapQueryMock.mockReturnValue({
      data: {
        'note-type-1': bookColumns,
        'note-type-2': movieColumns,
      },
      isError: false,
      isLoading: false,
      isSuccess: true,
    })

    renderNotesPage()

    const cardViewButton = screen.getByRole('button', { name: 'Card view' })
    const dataGridViewButton = screen.getByRole('button', {
      name: 'Data Grid view',
    })

    expect(cardViewButton.getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(cardViewButton)

    expect(cardViewButton.getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(dataGridViewButton)

    await waitFor(() => {
      expect(dataGridViewButton.getAttribute('aria-pressed')).toBe('true')
      expect(
        JSON.parse(
          window.localStorage.getItem('notestack.notes.view-preferences') ??
            '{}'
        ).viewMode
      ).toBe('data-grid')
    })

    expect(useNotesQueryMock).toHaveBeenLastCalledWith(
      {
        noteTypeIds: ['note-type-1'],
        sortBy: 'updatedAt',
        sortDirection: 'desc',
      },
      { enabled: true }
    )

    fireEvent.click(cardViewButton)

    await waitFor(() => {
      expect(
        JSON.parse(
          window.localStorage.getItem('notestack.notes.view-preferences') ??
            '{}'
        ).viewMode
      ).toBe('card')
    })
    expect(useNotesQueryMock).toHaveBeenLastCalledWith(
      {
        noteTypeIds: undefined,
        sortBy: 'updatedAt',
        sortDirection: 'desc',
      },
      { enabled: true }
    )
  })

  it('shows radio templates and only template-scoped labels in Data Grid filters', async () => {
    const scopedLabels: LabelDto[] = [
      {
        color: '#0070F2',
        createdAt: '2026-07-07T10:00:00.000Z',
        id: 'shared-label',
        name: 'shared',
        noteTypeId: null,
        title: 'Shared',
        updatedAt: '2026-07-07T10:00:00.000Z',
      },
      {
        color: '#188918',
        createdAt: '2026-07-07T10:00:00.000Z',
        id: 'book-label',
        name: 'book',
        noteTypeId: 'note-type-1',
        title: 'Book label',
        updatedAt: '2026-07-07T10:00:00.000Z',
      },
      {
        color: '#C35500',
        createdAt: '2026-07-07T10:00:00.000Z',
        id: 'movie-label',
        name: 'movie',
        noteTypeId: 'note-type-2',
        title: 'Movie label',
        updatedAt: '2026-07-07T10:00:00.000Z',
      },
    ]
    useLabelsQueryMock.mockReturnValue({
      data: scopedLabels,
      isError: false,
      isLoading: false,
    })
    useNoteTypeColumnsMapQueryMock.mockReturnValue({
      data: {
        'note-type-1': bookColumns,
        'note-type-2': movieColumns,
      },
      isError: false,
      isLoading: false,
      isSuccess: true,
    })

    renderNotesPage()

    fireEvent.click(screen.getByRole('button', { name: 'Data Grid view' }))

    await waitFor(() => {
      expect(
        screen
          .getByRole('button', { name: 'Data Grid view' })
          .getAttribute('aria-pressed')
      ).toBe('true')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))

    await waitFor(() => {
      expect(
        (screen.getByRole('radio', { name: 'Books' }) as HTMLInputElement)
          .checked
      ).toBe(true)
    })
    expect(screen.queryByRole('checkbox', { name: 'Books' })).toBeNull()
    expect(screen.getByRole('checkbox', { name: 'Shared' })).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: 'Book label' })).toBeTruthy()
    expect(screen.queryByRole('checkbox', { name: 'Movie label' })).toBeNull()

    fireEvent.click(screen.getByRole('radio', { name: 'Movies' }))

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: 'Movie label' })).toBeTruthy()
    })
    expect(screen.getByRole('checkbox', { name: 'Shared' })).toBeTruthy()
    expect(screen.queryByRole('checkbox', { name: 'Book label' })).toBeNull()
    await waitFor(() => {
      expect(useNotesQueryMock).toHaveBeenLastCalledWith(
        {
          noteTypeIds: ['note-type-2'],
          sortBy: 'updatedAt',
          sortDirection: 'desc',
        },
        { enabled: true }
      )
    })
  })

  it('gates a persisted Data Grid query until its template is reconciled', async () => {
    window.localStorage.setItem(
      'notestack.notes.view-preferences',
      JSON.stringify({
        version: 1,
        viewMode: 'data-grid',
        card: {
          labelIds: [],
          labelMatchMode: 'or',
          noteTypeIds: [],
        },
        dataGrid: {
          labelIds: [],
          labelMatchMode: 'or',
          noteTypeId: 'deleted-note-type',
        },
        dataGridColumnWidths: {},
      })
    )
    useNotesQueryMock.mockImplementation(() => ({
      data: [],
      isError: false,
      isLoading: false,
    }))

    renderNotesPage()

    expect(useNotesQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ noteTypeIds: ['deleted-note-type'] }),
      { enabled: false }
    )
    await waitFor(() => {
      expect(useNotesQueryMock).toHaveBeenLastCalledWith(
        {
          noteTypeIds: ['note-type-1'],
          sortBy: 'updatedAt',
          sortDirection: 'desc',
        },
        { enabled: true }
      )
    })
    expect(
      useNotesQueryMock.mock.calls.some(
        ([query, options]) =>
          options?.enabled === true && query.noteTypeIds === undefined
      )
    ).toBe(false)
  })

  it('uses the Data Grid labels before search and renders the same results', async () => {
    const labels: LabelDto[] = [
      {
        color: '#0070F2',
        createdAt: '2026-07-07T10:00:00.000Z',
        id: 'shared-label',
        name: 'shared',
        noteTypeId: null,
        title: 'Shared',
        updatedAt: '2026-07-07T10:00:00.000Z',
      },
    ]
    const labelColumn: ColumnDto = {
      config: null,
      createdAt: '2026-07-07T10:00:00.000Z',
      id: 'labels-column',
      isDefault: false,
      isHidden: false,
      isHiddenInDetail: false,
      name: 'labels',
      noteTypeId: 'note-type-1',
      sortOrder: 6,
      title: 'Labels',
      type: 'labels',
      updatedAt: '2026-07-07T10:00:00.000Z',
    }
    const matchingNote = {
      ...notes[0],
      values: { ...notes[0].values, 'labels-column': ['shared-label'] },
    }
    const nonMatchingNote = { ...notes[0], id: 'note-without-label' }
    window.localStorage.setItem(
      'notestack.notes.view-preferences',
      JSON.stringify({
        version: 1,
        viewMode: 'data-grid',
        card: { labelIds: [], labelMatchMode: 'or', noteTypeIds: [] },
        dataGrid: {
          labelIds: ['shared-label'],
          labelMatchMode: 'and',
          noteTypeId: 'note-type-1',
        },
        dataGridColumnWidths: {},
      })
    )
    useLabelsQueryMock.mockReturnValue({
      data: labels,
      isError: false,
      isLoading: false,
    })
    useNotesQueryMock.mockReturnValue({
      data: [matchingNote, nonMatchingNote],
      isError: false,
      isLoading: false,
    })
    useNoteTypeColumnsMapQueryMock.mockReturnValue({
      data: { 'note-type-1': [...bookColumns, labelColumn] },
      isError: false,
      isLoading: false,
      isSuccess: true,
    })
    useNotesSearchMock.mockImplementation((visibleNotes) => visibleNotes)

    renderNotesPage()

    await waitFor(() => {
      expect(useNotesSearchMock).toHaveBeenLastCalledWith(
        [matchingNote],
        '',
        {
          'note-type-1': 'Books',
          'note-type-2': 'Movies',
        },
        labels
      )
    })
    expect(useNotesQueryMock).toHaveBeenLastCalledWith(
      {
        noteTypeIds: ['note-type-1'],
        sortBy: 'updatedAt',
        sortDirection: 'desc',
      },
      { enabled: true }
    )
    expect(screen.getByRole('grid', { name: 'Notes Data Grid' })).toBeTruthy()

    fireEvent.click(screen.getByText('Alpha note'))

    await waitFor(() => expect(window.location.hash).toBe('#/notes/note-1'))
    expect(screen.queryByText('note-without-label')).toBeNull()
  })

  it('loads Data Grid columns for a selected template with no notes', async () => {
    window.localStorage.setItem(
      'notestack.notes.view-preferences',
      JSON.stringify({
        version: 1,
        viewMode: 'data-grid',
        card: { labelIds: [], labelMatchMode: 'or', noteTypeIds: [] },
        dataGrid: {
          labelIds: [],
          labelMatchMode: 'or',
          noteTypeId: 'note-type-1',
        },
        dataGridColumnWidths: {},
      })
    )
    useNotesQueryMock.mockReturnValue({
      data: [],
      isError: false,
      isLoading: false,
    })
    useNotesSearchMock.mockReturnValue([])

    renderNotesPage()

    await waitFor(() => {
      expect(useNoteTypeColumnsMapQueryMock).toHaveBeenCalledWith([
        'note-type-1',
      ])
    })
    expect(
      await screen.findByRole('columnheader', { name: 'Title' })
    ).toBeTruthy()
  })

  it('keeps an empty Data Grid scoped when no note templates exist', async () => {
    useNoteTypesQueryMock.mockReturnValue({
      data: [],
      isError: false,
      isLoading: false,
    })
    useNoteTypeColumnsMapQueryMock.mockReturnValue({
      data: {},
      isError: false,
      isLoading: false,
      isSuccess: true,
    })
    useNotesSearchMock.mockReturnValue([])

    renderNotesPage()
    fireEvent.click(screen.getByRole('button', { name: 'Data Grid view' }))

    expect(
      await screen.findByRole('heading', { name: 'No note template available' })
    ).toBeTruthy()
    expect(useNotesQueryMock).toHaveBeenLastCalledWith(
      {
        noteTypeIds: undefined,
        sortBy: 'updatedAt',
        sortDirection: 'desc',
      },
      { enabled: false }
    )
  })

  it('shows a Data Grid error instead of loading when filter prerequisites fail', async () => {
    useLabelsQueryMock.mockReturnValue({
      data: undefined,
      isError: true,
      isLoading: false,
    })

    renderNotesPage()
    fireEvent.click(screen.getByRole('button', { name: 'Data Grid view' }))

    expect(
      await screen.findByRole('heading', { name: 'Data Grid unavailable' })
    ).toBeTruthy()
    expect(screen.queryByText('Loading notes...')).toBeNull()
    expect(useNotesQueryMock).toHaveBeenLastCalledWith(
      {
        noteTypeIds: undefined,
        sortBy: 'updatedAt',
        sortDirection: 'desc',
      },
      { enabled: false }
    )
  })
})
