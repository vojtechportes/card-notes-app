import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ColumnDto } from '../../../../types/api'
import '../../../../i18n'
import { AppProviders } from '../../../../components/app-providers/app-providers'
import { ColumnsSection } from './columns-section'

const useNoteColumnsQueryMock = vi.hoisted(() => vi.fn())
const useNoteTypesQueryMock = vi.hoisted(() => vi.fn())
const useCreateColumnMutationMock = vi.hoisted(() => vi.fn())
const useUpdateColumnMutationMock = vi.hoisted(() => vi.fn())
const useReorderColumnsMutationMock = vi.hoisted(() => vi.fn())
const useDeleteColumnMutationMock = vi.hoisted(() => vi.fn())

vi.mock('../../hooks/use-note-columns-query', () => ({
  useNoteColumnsQuery: useNoteColumnsQueryMock,
}))

vi.mock('../../hooks/use-note-types-query', () => ({
  useNoteTypesQuery: useNoteTypesQueryMock,
}))

vi.mock('../../hooks/use-create-column-mutation', () => ({
  useCreateColumnMutation: useCreateColumnMutationMock,
}))

vi.mock('../../hooks/use-update-column-mutation', () => ({
  useUpdateColumnMutation: useUpdateColumnMutationMock,
}))

vi.mock('../../hooks/use-reorder-columns-mutation', () => ({
  useReorderColumnsMutation: useReorderColumnsMutationMock,
}))

vi.mock('../../hooks/use-delete-column-mutation', () => ({
  useDeleteColumnMutation: useDeleteColumnMutationMock,
}))

vi.mock('@dnd-kit/core', async () => {
  const actual =
    await vi.importActual<typeof import('@dnd-kit/core')>('@dnd-kit/core')

  return {
    ...actual,
    DndContext: ({
      children,
      onDragEnd,
    }: {
      children: ReactNode
      onDragEnd?: (event: unknown) => void
    }) => (
      <div>
        <button
          onClick={() =>
            onDragEnd?.({
              active: { id: 'reference-link' },
              over: { id: 'summary' },
            })
          }
          type="button"
        >
          Trigger reorder
        </button>
        {children}
      </div>
    ),
    KeyboardSensor: function KeyboardSensor() {},
    PointerSensor: function PointerSensor() {},
    useSensor: vi.fn(() => ({})),
    useSensors: vi.fn((...sensors: unknown[]) => sensors),
  }
})

vi.mock('@dnd-kit/sortable', async () => {
  const actual =
    await vi.importActual<typeof import('@dnd-kit/sortable')>(
      '@dnd-kit/sortable'
    )

  return {
    ...actual,
    SortableContext: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    sortableKeyboardCoordinates: vi.fn(),
    useSortable: vi.fn(() => ({
      attributes: {},
      isDragging: false,
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: undefined,
    })),
    verticalListSortingStrategy: vi.fn(),
  }
})

const columns: ColumnDto[] = [
  {
    config: null,
    createdAt: '2026-07-08T10:00:00.000Z',
    id: 'created-at',
    noteTypeId: 'note-type-1',
    isDefault: true,
    isHidden: false,
    name: 'createdAt',
    sortOrder: 0,
    title: 'Created at',
    type: 'date',
    updatedAt: '2026-07-08T10:00:00.000Z',
  },
  {
    config: null,
    createdAt: '2026-07-08T10:00:00.000Z',
    id: 'summary',
    noteTypeId: 'note-type-1',
    isDefault: false,
    isHidden: false,
    name: 'summary',
    sortOrder: 1,
    title: 'Summary',
    type: 'text',
    updatedAt: '2026-07-08T10:00:00.000Z',
  },
  {
    config: null,
    createdAt: '2026-07-08T10:00:00.000Z',
    id: 'reference-link',
    noteTypeId: 'note-type-1',
    isDefault: false,
    isHidden: true,
    name: 'referenceLink',
    sortOrder: 2,
    title: 'Reference link',
    type: 'link',
    updatedAt: '2026-07-08T10:00:00.000Z',
  },
]

const createMutation = {
  isPending: false,
  mutateAsync: vi.fn(),
}

const updateMutation = {
  isPending: false,
  mutateAsync: vi.fn(),
}

const reorderMutation = {
  isPending: false,
  mutateAsync: vi.fn(),
}

const deleteMutation = {
  isPending: false,
  mutateAsync: vi.fn(),
}

const renderColumnsSection = () => {
  return render(
    <AppProviders>
      <ColumnsSection noteTypeId="note-type-1" />
    </AppProviders>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  useNoteColumnsQueryMock.mockReturnValue({
    data: columns,
    isError: false,
    isLoading: false,
  })
  useNoteTypesQueryMock.mockReturnValue({
    data: [
      {
        createdAt: '2026-07-08T10:00:00.000Z',
        id: 'note-type-1',
        title: 'Books',
        updatedAt: '2026-07-08T10:00:00.000Z',
      },
      {
        createdAt: '2026-07-08T10:00:00.000Z',
        id: 'note-type-2',
        title: 'Research',
        updatedAt: '2026-07-08T10:00:00.000Z',
      },
    ],
    isError: false,
    isLoading: false,
  })
  createMutation.mutateAsync.mockResolvedValue({})
  updateMutation.mutateAsync.mockResolvedValue({})
  reorderMutation.mutateAsync.mockResolvedValue({})
  deleteMutation.mutateAsync.mockResolvedValue({})
  useCreateColumnMutationMock.mockReturnValue(createMutation)
  useUpdateColumnMutationMock.mockReturnValue(updateMutation)
  useReorderColumnsMutationMock.mockReturnValue(reorderMutation)
  useDeleteColumnMutationMock.mockReturnValue(deleteMutation)
})

afterEach(() => {
  cleanup()
})

describe('ColumnsSection', () => {
  it('renders loaded fields and does not expose delete for default fields', () => {
    renderColumnsSection()

    const defaultRow = screen.getByText('Created at').closest('li')
    const customRow = screen.getByText('Summary').closest('li')

    expect(defaultRow).toBeTruthy()
    expect(customRow).toBeTruthy()
    expect(
      within(defaultRow as HTMLElement).queryByRole('button', {
        name: 'Delete field',
      })
    ).toBeNull()
    expect(
      within(customRow as HTMLElement).getByRole('button', {
        name: 'Delete field',
      })
    ).toBeTruthy()
  })

  it('creates the first field when the active note type currently has no fields', async () => {
    useNoteColumnsQueryMock.mockReturnValueOnce({
      data: [],
      isError: false,
      isLoading: false,
    })

    renderColumnsSection()

    fireEvent.click(screen.getByRole('button', { name: 'Add field' }))
    fireEvent.change(screen.getByLabelText('Column title'), {
      target: { value: 'First field' },
    })
    fireEvent.change(screen.getByLabelText('Column name'), {
      target: { value: 'firstField' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create field' }))

    await waitFor(() => {
      expect(createMutation.mutateAsync).toHaveBeenCalledWith({
        column: {
          config: null,
          isHidden: false,
          name: 'firstField',
          title: 'First field',
          type: 'text',
        },
        noteTypeId: 'note-type-1',
      })
    })
  })

  it('creates a custom field and validates duplicate names', async () => {
    renderColumnsSection()

    fireEvent.click(screen.getByRole('button', { name: 'Add field' }))

    fireEvent.change(screen.getByLabelText('Column title'), {
      target: { value: 'Duplicate summary' },
    })
    fireEvent.change(screen.getByLabelText('Column name'), {
      target: { value: 'summary' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create field' }))

    expect(await screen.findByText('Field name must be unique.')).toBeTruthy()
    expect(createMutation.mutateAsync).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Column name'), {
      target: { value: 'projectStatus' },
    })
    fireEvent.mouseDown(screen.getByLabelText('Column type'))
    fireEvent.click(await screen.findByRole('option', { name: 'Number' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create field' }))

    await waitFor(() => {
      expect(createMutation.mutateAsync).toHaveBeenCalledWith({
        column: {
          config: null,
          isHidden: false,
          name: 'projectStatus',
          title: 'Duplicate summary',
          type: 'number',
        },
        noteTypeId: 'note-type-1',
      })
    })
  })

  it('edits a field and keeps default identity fields disabled', async () => {
    renderColumnsSection()

    fireEvent.click(
      within(
        screen.getByText('Created at').closest('li') as HTMLElement
      ).getByRole('button', { name: 'Edit field' })
    )

    expect(
      (screen.getByLabelText('Column name') as HTMLInputElement).disabled
    ).toBe(true)
    expect(
      screen
        .getByRole('combobox', { name: 'Column type' })
        .getAttribute('aria-disabled')
    ).toBe('true')

    fireEvent.change(screen.getByLabelText('Column title'), {
      target: { value: 'Created on' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
        column: {
          config: null,
          isHidden: false,
          name: 'createdAt',
          title: 'Created on',
          type: 'date',
        },
        id: 'created-at',
        noteTypeId: 'note-type-1',
      })
    })
  })

  it('toggles visibility and reorders fields', async () => {
    renderColumnsSection()

    const hiddenRow = screen
      .getByText('Reference link')
      .closest('li') as HTMLElement
    fireEvent.click(
      within(hiddenRow).getByRole('button', { name: 'Show field' })
    )

    await waitFor(() => {
      expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
        column: { isHidden: false },
        id: 'reference-link',
        noteTypeId: 'note-type-1',
      })
    })

    fireEvent.click(screen.getByRole('button', { name: 'Trigger reorder' }))

    await waitFor(() => {
      expect(reorderMutation.mutateAsync).toHaveBeenCalledWith({
        columnOrder: { columnIds: ['created-at', 'reference-link', 'summary'] },
        noteTypeId: 'note-type-1',
      })
    })
  })

  it('deletes a custom field definition only when that choice is selected', async () => {
    renderColumnsSection()

    const hiddenRow = screen
      .getByText('Reference link')
      .closest('li') as HTMLElement
    fireEvent.click(
      within(hiddenRow).getByRole('button', { name: 'Delete field' })
    )

    const confirmationDialog = await screen.findByRole('dialog')
    expect(
      within(confirmationDialog).getByText(
        /Choose whether to remove "Reference link" only from your column setup/
      )
    ).toBeTruthy()

    fireEvent.click(
      within(confirmationDialog).getByRole('button', {
        name: /^Delete field definition only/,
      })
    )

    await waitFor(() => {
      expect(deleteMutation.mutateAsync).toHaveBeenCalledWith({
        id: 'reference-link',
        noteTypeId: 'note-type-1',
        query: { deleteMode: 'definitionOnly' },
      })
    })
  })

  it('deletes a custom field and saved values when that choice is selected', async () => {
    renderColumnsSection()

    const hiddenRow = screen
      .getByText('Reference link')
      .closest('li') as HTMLElement
    fireEvent.click(
      within(hiddenRow).getByRole('button', { name: 'Delete field' })
    )

    const confirmationDialog = await screen.findByRole('dialog')
    fireEvent.click(
      within(confirmationDialog).getByRole('button', {
        name: /^Delete field and saved values/,
      })
    )

    await waitFor(() => {
      expect(deleteMutation.mutateAsync).toHaveBeenCalledWith({
        id: 'reference-link',
        noteTypeId: 'note-type-1',
        query: { deleteMode: 'definitionAndValues' },
      })
    })
  })

  it('does not delete a custom field when the delete choice dialog is cancelled', async () => {
    renderColumnsSection()

    const hiddenRow = screen
      .getByText('Reference link')
      .closest('li') as HTMLElement
    fireEvent.click(
      within(hiddenRow).getByRole('button', { name: 'Delete field' })
    )

    const confirmationDialog = await screen.findByRole('dialog')
    fireEvent.click(
      within(confirmationDialog).getByRole('button', { name: 'Keep field' })
    )

    await waitFor(() => {
      expect(deleteMutation.mutateAsync).not.toHaveBeenCalled()
    })
  })

  it('shows a localized delete error when the chosen delete action fails', async () => {
    deleteMutation.mutateAsync.mockRejectedValueOnce(new Error('delete failed'))
    renderColumnsSection()

    const hiddenRow = screen
      .getByText('Reference link')
      .closest('li') as HTMLElement
    fireEvent.click(
      within(hiddenRow).getByRole('button', { name: 'Delete field' })
    )

    const confirmationDialog = await screen.findByRole('dialog')
    fireEvent.click(
      within(confirmationDialog).getByRole('button', {
        name: /^Delete field and saved values/,
      })
    )

    expect(
      await screen.findByText('The field could not be deleted. Try again.')
    ).toBeTruthy()
  })

  it('shows loading and error states from the fields query', () => {
    useNoteColumnsQueryMock.mockReturnValueOnce({
      data: undefined,
      isError: false,
      isLoading: true,
    })

    renderColumnsSection()
    expect(screen.getByText('Loading fields...')).toBeTruthy()

    cleanup()

    useNoteColumnsQueryMock.mockReturnValueOnce({
      data: undefined,
      isError: true,
      isLoading: false,
    })

    renderColumnsSection()
    expect(
      screen.getByText('Fields could not be loaded right now.')
    ).toBeTruthy()
  })
  it('creates a single-label field with all sources when none are selected', async () => {
    renderColumnsSection()

    fireEvent.click(screen.getByRole('button', { name: 'Add field' }))
    fireEvent.change(screen.getByLabelText('Column title'), {
      target: { value: 'Topics' },
    })
    fireEvent.change(screen.getByLabelText('Column name'), {
      target: { value: 'topics' },
    })
    fireEvent.mouseDown(screen.getByLabelText('Column type'))
    fireEvent.click(await screen.findByRole('option', { name: 'Labels' }))

    expect(
      (
        screen.getByRole('radio', {
          name: 'Single label',
        }) as HTMLInputElement
      ).checked
    ).toBe(true)
    expect(
      screen.getByText(
        'Leave all sources unselected to make shared and all note-template labels available.'
      )
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Create field' }))

    await waitFor(() => {
      expect(createMutation.mutateAsync).toHaveBeenCalledWith({
        column: {
          config: {
            allowMultiple: false,
            sources: null,
          },
          isHidden: false,
          name: 'topics',
          title: 'Topics',
          type: 'labels',
        },
        noteTypeId: 'note-type-1',
      })
    })
  })

  it('maps multiple explicit label sources into the labels config', async () => {
    renderColumnsSection()

    fireEvent.click(screen.getByRole('button', { name: 'Add field' }))
    fireEvent.change(screen.getByLabelText('Column title'), {
      target: { value: 'Topics' },
    })
    fireEvent.change(screen.getByLabelText('Column name'), {
      target: { value: 'topics' },
    })
    fireEvent.mouseDown(screen.getByLabelText('Column type'))
    fireEvent.click(await screen.findByRole('option', { name: 'Labels' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Multiple labels' }))

    fireEvent.mouseDown(
      screen.getByRole('combobox', { name: 'Allowed label sources' })
    )
    fireEvent.click(await screen.findByRole('option', { name: /Shared/ }))
    fireEvent.click(await screen.findByRole('option', { name: 'Research' }))
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'Create field' }))

    await waitFor(() => {
      expect(createMutation.mutateAsync).toHaveBeenCalledWith({
        column: {
          config: {
            allowMultiple: true,
            sources: {
              includeShared: true,
              noteTypeIds: ['note-type-2'],
            },
          },
          isHidden: false,
          name: 'topics',
          title: 'Topics',
          type: 'labels',
        },
        noteTypeId: 'note-type-1',
      })
    })
  })

  it('hydrates an existing labels field configuration for editing', async () => {
    const labelsColumn: ColumnDto = {
      config: {
        allowMultiple: true,
        sources: {
          includeShared: true,
          noteTypeIds: ['note-type-2'],
        },
      },
      createdAt: '2026-07-08T10:00:00.000Z',
      id: 'topics',
      isDefault: false,
      isHidden: false,
      name: 'topics',
      noteTypeId: 'note-type-1',
      sortOrder: 3,
      title: 'Topics',
      type: 'labels',
      updatedAt: '2026-07-08T10:00:00.000Z',
    }

    useNoteColumnsQueryMock.mockReturnValueOnce({
      data: [...columns, labelsColumn],
      isError: false,
      isLoading: false,
    })

    renderColumnsSection()

    fireEvent.click(
      within(screen.getByText('Topics').closest('li') as HTMLElement).getByRole(
        'button',
        { name: 'Edit field' }
      )
    )

    expect(
      (
        screen.getByRole('radio', {
          name: 'Multiple labels',
        }) as HTMLInputElement
      ).checked
    ).toBe(true)
    expect(
      screen.getByRole('combobox', { name: 'Allowed label sources' })
        .textContent
    ).toContain('Shared, Research')

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
        column: {
          config: {
            allowMultiple: true,
            sources: {
              includeShared: true,
              noteTypeIds: ['note-type-2'],
            },
          },
          isHidden: false,
          name: 'topics',
          title: 'Topics',
          type: 'labels',
        },
        id: 'topics',
        noteTypeId: 'note-type-1',
      })
    })
  })

  it('shows a localized error when label sources cannot be loaded', async () => {
    useNoteTypesQueryMock.mockReturnValue({
      data: undefined,
      isError: true,
      isLoading: false,
    })

    renderColumnsSection()

    fireEvent.click(screen.getByRole('button', { name: 'Add field' }))
    fireEvent.mouseDown(screen.getByLabelText('Column type'))
    fireEvent.click(await screen.findByRole('option', { name: 'Labels' }))

    expect(
      await screen.findByText('Label sources could not be loaded right now.')
    ).toBeTruthy()
  })
})
