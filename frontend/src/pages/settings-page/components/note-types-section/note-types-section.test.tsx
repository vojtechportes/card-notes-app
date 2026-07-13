import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { Route, Routes, useLocation } from 'react-router-dom'
import '../../../../i18n'
import { AppProviders } from '../../../../components/app-providers/app-providers'
import {
  SideDrawer,
  SideDrawerProvider,
} from '../../../../components/side-drawer'
import { NoteTypesSection } from './note-types-section'

const useNoteTypesQueryMock = vi.hoisted(() => vi.fn())
const useNoteTypeDetailQueryMock = vi.hoisted(() => vi.fn())
const useCreateNoteTypeMutationMock = vi.hoisted(() => vi.fn())
const useUpdateNoteTypeMutationMock = vi.hoisted(() => vi.fn())
const useDeleteNoteTypeMutationMock = vi.hoisted(() => vi.fn())

vi.mock('../../hooks/use-note-types-query', () => ({
  useNoteTypesQuery: useNoteTypesQueryMock,
}))

vi.mock('../../hooks/use-note-type-detail-query', () => ({
  useNoteTypeDetailQuery: useNoteTypeDetailQueryMock,
}))

vi.mock('../../hooks/use-create-note-type-mutation', () => ({
  useCreateNoteTypeMutation: useCreateNoteTypeMutationMock,
}))

vi.mock('../../hooks/use-update-note-type-mutation', () => ({
  useUpdateNoteTypeMutation: useUpdateNoteTypeMutationMock,
}))

vi.mock('../../hooks/use-delete-note-type-mutation', () => ({
  useDeleteNoteTypeMutation: useDeleteNoteTypeMutationMock,
}))

vi.mock('../columns-section/columns-section', () => ({
  ColumnsSection: ({
    noteTypeId,
    variant,
  }: {
    noteTypeId: string
    variant?: 'embedded' | 'section'
  }) => {
    return (
      <div>
        Fields section for {noteTypeId} ({variant ?? 'section'})
      </div>
    )
  },
}))

const createdNoteType = {
  createdAt: '2026-07-11T10:00:00.000Z',
  id: 'note-type-3',
  title: 'Recipes',
  updatedAt: '2026-07-11T10:00:00.000Z',
}

const noteTypes = [
  {
    createdAt: '2026-07-08T10:00:00.000Z',
    id: 'note-type-1',
    title: 'Projects',
    updatedAt: '2026-07-08T10:00:00.000Z',
  },
  {
    createdAt: '2026-07-09T10:00:00.000Z',
    id: 'note-type-2',
    title: 'Ideas',
    updatedAt: '2026-07-10T10:00:00.000Z',
  },
  createdNoteType,
]

const noteTypeDetails = {
  'note-type-1': {
    ...noteTypes[0],
    columns: [
      {
        config: null,
        createdAt: '2026-07-08T10:00:00.000Z',
        id: 'column-created',
        isDefault: true,
        isHidden: false,
        name: 'createdAt',
        noteTypeId: 'note-type-1',
        sortOrder: 0,
        title: 'Created at',
        type: 'date',
        updatedAt: '2026-07-08T10:00:00.000Z',
      },
      {
        config: null,
        createdAt: '2026-07-08T10:00:00.000Z',
        id: 'source-summary',
        isDefault: false,
        isHidden: false,
        name: 'summary',
        noteTypeId: 'note-type-1',
        sortOrder: 1,
        title: 'Summary',
        type: 'text',
        updatedAt: '2026-07-08T10:00:00.000Z',
      },
      {
        config: null,
        createdAt: '2026-07-08T10:00:00.000Z',
        id: 'source-url',
        isDefault: false,
        isHidden: false,
        name: 'referenceLink',
        noteTypeId: 'note-type-1',
        sortOrder: 2,
        title: 'Reference link',
        type: 'link',
        updatedAt: '2026-07-08T10:00:00.000Z',
      },
    ],
  },
  'note-type-2': {
    ...noteTypes[1],
    columns: [
      {
        config: null,
        createdAt: '2026-07-09T10:00:00.000Z',
        id: 'target-created',
        isDefault: true,
        isHidden: false,
        name: 'createdAt',
        noteTypeId: 'note-type-2',
        sortOrder: 0,
        title: 'Created at',
        type: 'date',
        updatedAt: '2026-07-09T10:00:00.000Z',
      },
      {
        config: null,
        createdAt: '2026-07-09T10:00:00.000Z',
        id: 'target-summary',
        isDefault: false,
        isHidden: false,
        name: 'summary',
        noteTypeId: 'note-type-2',
        sortOrder: 1,
        title: 'Summary',
        type: 'text',
        updatedAt: '2026-07-09T10:00:00.000Z',
      },
      {
        config: null,
        createdAt: '2026-07-09T10:00:00.000Z',
        id: 'target-link',
        isDefault: false,
        isHidden: false,
        name: 'referenceLink',
        noteTypeId: 'note-type-2',
        sortOrder: 2,
        title: 'Reference link',
        type: 'text',
        updatedAt: '2026-07-09T10:00:00.000Z',
      },
    ],
  },
  'note-type-3': {
    ...createdNoteType,
    columns: [
      {
        config: null,
        createdAt: '2026-07-11T10:00:00.000Z',
        id: 'recipe-created',
        isDefault: true,
        isHidden: false,
        name: 'createdAt',
        noteTypeId: 'note-type-3',
        sortOrder: 0,
        title: 'Created at',
        type: 'date',
        updatedAt: '2026-07-11T10:00:00.000Z',
      },
      {
        config: null,
        createdAt: '2026-07-11T10:00:00.000Z',
        id: 'recipe-title',
        isDefault: false,
        isHidden: false,
        name: 'title',
        noteTypeId: 'note-type-3',
        sortOrder: 1,
        title: 'Recipe title',
        type: 'text',
        updatedAt: '2026-07-11T10:00:00.000Z',
      },
    ],
  },
}

const createMutation = {
  isPending: false,
  mutateAsync: vi.fn(),
}

const updateMutation = {
  isPending: false,
  mutateAsync: vi.fn(),
}

const deleteMutation = {
  isPending: false,
  mutateAsync: vi.fn(),
}

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  vi.stubGlobal('ResizeObserver', ResizeObserverMock)
})

beforeEach(() => {
  vi.clearAllMocks()
  window.location.hash = ''
  useNoteTypesQueryMock.mockReturnValue({
    data: noteTypes,
    isError: false,
    isLoading: false,
  })
  useNoteTypeDetailQueryMock.mockImplementation((noteTypeId?: string) => ({
    data: noteTypeId
      ? noteTypeDetails[noteTypeId as keyof typeof noteTypeDetails]
      : undefined,
    isError: false,
    isLoading: false,
  }))
  createMutation.mutateAsync.mockResolvedValue(createdNoteType)
  updateMutation.mutateAsync.mockResolvedValue(noteTypes[0])
  deleteMutation.mutateAsync.mockResolvedValue({
    deletedNoteTypeId: 'note-type-1',
    deletedNotesCount: 0,
    movedNotesCount: 2,
    targetNoteTypeId: 'note-type-2',
  })
  useCreateNoteTypeMutationMock.mockReturnValue(createMutation)
  useUpdateNoteTypeMutationMock.mockReturnValue(updateMutation)
  useDeleteNoteTypeMutationMock.mockReturnValue(deleteMutation)
})

afterEach(() => {
  cleanup()
  window.location.hash = ''
})

const LocationProbe = () => {
  const location = useLocation()

  return <span data-testid="location-path">{location.pathname}</span>
}

const renderNoteTypesSection = (route = '/settings') => {
  window.location.hash = `#${route}`

  return render(
    <AppProviders>
      <SideDrawerProvider>
        <Routes>
          <Route
            path="/settings"
            element={
              <>
                <NoteTypesSection />
                <LocationProbe />
              </>
            }
          />
          <Route
            path="/settings/:noteTypeId"
            element={
              <>
                <NoteTypesSection />
                <LocationProbe />
              </>
            }
          />
        </Routes>
        <SideDrawer />
      </SideDrawerProvider>
    </AppProviders>
  )
}

describe('NoteTypesSection', () => {
  it('renders note types in a grid and opens the shared detail drawer route', async () => {
    renderNoteTypesSection()

    expect(screen.getByText('Projects')).toBeTruthy()
    expect(screen.getByText('Ideas')).toBeTruthy()

    fireEvent.click(screen.getByText('Projects'))

    await waitFor(() => {
      expect(screen.getByTestId('location-path').textContent).toBe(
        '/settings/note-type-1'
      )
    })
    expect(
      await screen.findByText('Fields section for note-type-1 (embedded)')
    ).toBeTruthy()
    expect(screen.getAllByText('Created at').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Updated at').length).toBeGreaterThan(0)
  })

  it('opens the shared detail drawer from a note type detail route', async () => {
    renderNoteTypesSection('/settings/note-type-2')

    expect(
      await screen.findByText('Fields section for note-type-2 (embedded)')
    ).toBeTruthy()
    expect(screen.getByTestId('location-path').textContent).toBe(
      '/settings/note-type-2'
    )
  })

  it('returns to settings when the note type detail drawer is closed', async () => {
    renderNoteTypesSection('/settings/note-type-1')

    expect(
      await screen.findByText('Fields section for note-type-1 (embedded)')
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Close detail' }))

    await waitFor(() => {
      expect(screen.getByTestId('location-path').textContent).toBe('/settings')
    })
  })

  it('redirects an unknown note type detail route back to settings', async () => {
    renderNoteTypesSection('/settings/missing-note-type')

    await waitFor(() => {
      expect(screen.getByTestId('location-path').textContent).toBe('/settings')
    })
  })

  it('creates a new note type from the section action and opens its detail drawer route', async () => {
    renderNoteTypesSection()

    fireEvent.click(screen.getAllByRole('button', { name: 'Add note type' })[0])
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Recipes' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create note type' }))

    await waitFor(() => {
      expect(createMutation.mutateAsync).toHaveBeenCalledWith({
        title: 'Recipes',
      })
    })

    await waitFor(() => {
      expect(screen.getByTestId('location-path').textContent).toBe(
        '/settings/note-type-3'
      )
    })
    expect(
      await screen.findByText('Fields section for note-type-3 (embedded)')
    ).toBeTruthy()
    expect(screen.getAllByText('Recipes').length).toBeGreaterThan(0)
  })

  it('edits only the note type name', async () => {
    renderNoteTypesSection()

    fireEvent.click(
      screen.getAllByRole('button', { name: 'Edit note type' })[0]
    )
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Projects updated' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save note type' }))

    await waitFor(() => {
      expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
        id: 'note-type-1',
        noteType: {
          title: 'Projects updated',
        },
      })
    })
  })

  it('submits move-notes delete payload with compatible preselected mappings', async () => {
    renderNoteTypesSection()

    fireEvent.click(
      screen.getAllByRole('button', { name: 'Delete note type' })[0]
    )
    fireEvent.click(
      screen.getByRole('radio', {
        name: 'Delete this note type and move its notes to another note type',
      })
    )

    const summaryFieldSelect = screen.getAllByRole('combobox', {
      name: 'Target field',
    })[0]
    const linkFieldSelect = screen.getAllByRole('combobox', {
      name: 'Target field',
    })[1]

    expect(summaryFieldSelect.textContent).toContain('Summary')
    expect(linkFieldSelect.textContent).toContain('Reference link')

    const dialog = screen.getByRole('dialog')
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Delete note type' })
    )

    await waitFor(() => {
      expect(deleteMutation.mutateAsync).toHaveBeenCalledWith({
        id: 'note-type-1',
        noteType: {
          fieldMappings: [
            {
              sourceColumnId: 'source-summary',
              targetColumnId: 'target-summary',
            },
            {
              sourceColumnId: 'source-url',
              targetColumnId: 'target-link',
            },
          ],
          mode: 'move-notes',
          targetNoteTypeId: 'note-type-2',
        },
      })
    })
  })

  it('explains last-note-type recreation when deleting the final type with notes', () => {
    useNoteTypesQueryMock.mockReturnValue({
      data: [noteTypes[0]],
      isError: false,
      isLoading: false,
    })

    renderNoteTypesSection()

    fireEvent.click(
      screen.getAllByRole('button', { name: 'Delete note type' })[0]
    )

    expect(screen.getByText(/recreate Default/)).toBeTruthy()
  })
})
