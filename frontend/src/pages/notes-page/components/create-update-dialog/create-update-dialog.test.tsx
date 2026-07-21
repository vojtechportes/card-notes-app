import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ColumnDto, NoteDto, NoteTypeDto } from '../../../../types/api'
import '../../../../i18n'
import { CreateUpdateDialog } from './create-update-dialog'

const useLabelsQueryMock = vi.hoisted(() => vi.fn())
const useNoteColumnsQueryMock = vi.hoisted(() => vi.fn())
const useNoteTypesQueryMock = vi.hoisted(() => vi.fn())
const useCreateNoteMutationMock = vi.hoisted(() => vi.fn())
const useUpdateNoteMutationMock = vi.hoisted(() => vi.fn())
const createNoteImageValueFromFileMock = vi.hoisted(() => vi.fn())

vi.mock('../../../settings-page/hooks/use-labels-query', () => ({
  useLabelsQuery: useLabelsQueryMock,
}))

vi.mock('../../../settings-page/hooks/use-note-types-query', () => ({
  useNoteTypesQuery: useNoteTypesQueryMock,
}))

vi.mock('../../hooks/use-note-columns-query', () => ({
  useNoteColumnsQuery: useNoteColumnsQueryMock,
}))

vi.mock('../../hooks/use-notes-query', () => ({
  useCreateNoteMutation: useCreateNoteMutationMock,
  useUpdateNoteMutation: useUpdateNoteMutationMock,
}))

vi.mock('./utils/create-note-image-value-from-file.util', () => ({
  createNoteImageValueFromFile: createNoteImageValueFromFileMock,
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
    id: 'title-column',
    noteTypeId: 'note-type-1',
    isDefault: false,
    isHidden: false,
    name: 'title',
    sortOrder: 1,
    title: 'Title',
    type: 'text',
    updatedAt: '2026-07-07T10:00:00.000Z',
  },
  {
    config: null,
    createdAt: '2026-07-07T10:00:00.000Z',
    id: 'due-date-column',
    noteTypeId: 'note-type-1',
    isDefault: false,
    isHidden: false,
    name: 'dueDate',
    sortOrder: 2,
    title: 'Due date',
    type: 'date',
    updatedAt: '2026-07-07T10:00:00.000Z',
  },
  {
    config: null,
    createdAt: '2026-07-07T10:00:00.000Z',
    id: 'amount-column',
    noteTypeId: 'note-type-1',
    isDefault: false,
    isHidden: false,
    name: 'amount',
    sortOrder: 3,
    title: 'Amount',
    type: 'number',
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
    id: 'receipt-column',
    noteTypeId: 'note-type-1',
    isDefault: false,
    isHidden: false,
    name: 'receiptImage',
    sortOrder: 5,
    title: 'Receipt image',
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
    id: 'director-column',
    noteTypeId: 'note-type-2',
    isDefault: false,
    isHidden: false,
    name: 'director',
    sortOrder: 1,
    title: 'Director',
    type: 'text',
    updatedAt: '2026-07-07T10:00:00.000Z',
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

const selectNoteType = async (label: string) => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: label }))
  fireEvent.click(
    await screen.findByRole('option', {
      name: label === 'Note template' ? /.*/ : label,
    })
  )
}

const selectSpecificNoteType = async (title: string) => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Note template' }))
  fireEvent.click(await screen.findByRole('option', { name: title }))
}

beforeEach(() => {
  vi.clearAllMocks()
  useLabelsQueryMock.mockReturnValue({
    data: [],
    isError: false,
    isLoading: false,
  })
  useNoteTypesQueryMock.mockReturnValue({
    data: noteTypes,
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
  createMutation.mutateAsync.mockResolvedValue({})
  updateMutation.mutateAsync.mockResolvedValue({})
  useCreateNoteMutationMock.mockReturnValue(createMutation)
  useUpdateNoteMutationMock.mockReturnValue(updateMutation)
  createNoteImageValueFromFileMock.mockResolvedValue({
    altText: 'receipt',
    dataUrl: 'data:image/png;base64,receipt',
    fileName: 'receipt.png',
    height: 80,
    mimeType: 'image/png',
    size: 256,
    width: 120,
  })
})

afterEach(() => {
  cleanup()
})

describe('CreateUpdateDialog', () => {
  it('renders note template selection first and waits to load fields in create mode', () => {
    render(<CreateUpdateDialog mode="create" onClose={vi.fn()} open />)

    expect(screen.getByLabelText('Note template')).toBeTruthy()
    expect(
      screen.getByText('Select a note template to load its fields.')
    ).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: 'Title' })).toBeNull()
  })

  it('loads editable fields for the selected create note template only', async () => {
    render(<CreateUpdateDialog mode="create" onClose={vi.fn()} open />)

    await selectSpecificNoteType('Movies')

    expect(screen.getByRole('textbox', { name: 'Director' })).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: 'Title' })).toBeNull()
  })

  it('shows the loading state from the note templates query', () => {
    useLabelsQueryMock.mockReturnValue({
      data: [],
      isError: false,
      isLoading: false,
    })
    useNoteTypesQueryMock.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: true,
    })

    render(<CreateUpdateDialog mode="create" onClose={vi.fn()} open />)

    expect(screen.getByText('Loading note templates...')).toBeTruthy()
  })

  it('shows the error state from the note columns query after note template selection', async () => {
    useNoteColumnsQueryMock.mockReturnValue({
      data: undefined,
      isError: true,
      isLoading: false,
    })

    render(<CreateUpdateDialog mode="create" onClose={vi.fn()} open />)

    await selectSpecificNoteType('Books')

    expect(screen.getByText('Note fields could not be loaded.')).toBeTruthy()
  })

  it('creates an empty note when the selected note template has no editable columns', async () => {
    const onClose = vi.fn()

    useNoteColumnsQueryMock.mockImplementation((noteTypeId?: string) => ({
      data:
        noteTypeId === 'note-type-1'
          ? [bookColumns[0]]
          : noteTypeId === 'note-type-2'
            ? movieColumns
            : undefined,
      isError: false,
      isLoading: false,
    }))

    render(<CreateUpdateDialog mode="create" onClose={onClose} open />)

    await selectSpecificNoteType('Books')
    fireEvent.click(screen.getByRole('button', { name: 'Create note' }))

    await waitFor(() => {
      expect(createMutation.mutateAsync).toHaveBeenCalledWith({
        noteTypeId: 'note-type-1',
      })
    })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('preserves in-progress values when note columns refetch while the dialog stays open for the same note template', async () => {
    let currentColumns = bookColumns
    const onClose = vi.fn()

    useNoteColumnsQueryMock.mockImplementation((noteTypeId?: string) => ({
      data: noteTypeId ? currentColumns : undefined,
      isError: false,
      isLoading: false,
    }))

    const { rerender } = render(
      <CreateUpdateDialog mode="create" onClose={onClose} open />
    )

    await selectSpecificNoteType('Books')
    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
      target: { value: 'Draft note' },
    })

    currentColumns = [...bookColumns]
    rerender(<CreateUpdateDialog mode="create" onClose={onClose} open />)

    expect(
      (screen.getByRole('textbox', { name: 'Title' }) as HTMLInputElement).value
    ).toBe('Draft note')
  })

  it('submits create values keyed by column id for the selected note template and supports image, link, and date fields', async () => {
    const onClose = vi.fn()
    render(<CreateUpdateDialog mode="create" onClose={onClose} open />)

    await selectSpecificNoteType('Books')
    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
      target: { value: 'Weekly summary' },
    })
    fireEvent.change(screen.getByLabelText('Due date'), {
      target: { value: '2026-07-08' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Amount' }), {
      target: { value: '42.5' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Reference link' }), {
      target: { value: 'https://example.com/reference' },
    })

    const file = new File(['receipt'], 'receipt.png', { type: 'image/png' })
    fireEvent.drop(
      screen.getByRole('group', { name: 'Receipt image image drop zone' }),
      {
        dataTransfer: {
          files: [file],
        },
      }
    )

    await waitFor(() => {
      expect(createNoteImageValueFromFileMock).toHaveBeenCalledWith(file)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Create note' }))

    await waitFor(() => {
      expect(createMutation.mutateAsync).toHaveBeenCalledWith({
        noteTypeId: 'note-type-1',
        values: {
          'amount-column': 42.5,
          'due-date-column': '2026-07-08',
          'link-column': 'https://example.com/reference',
          'receipt-column': {
            altText: 'receipt',
            dataUrl: 'data:image/png;base64,receipt',
            fileName: 'receipt.png',
            height: 80,
            mimeType: 'image/png',
            size: 256,
            width: 120,
          },
          'title-column': 'Weekly summary',
        },
      })
    })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('removes individual images from a multi-image field before submit', async () => {
    const onClose = vi.fn()
    const multiImageColumns = bookColumns.map((column) =>
      column.id === 'receipt-column'
        ? { ...column, config: { isMultiImage: true } }
        : column
    )

    useNoteColumnsQueryMock.mockImplementation((noteTypeId?: string) => ({
      data:
        noteTypeId === 'note-type-1'
          ? multiImageColumns
          : noteTypeId === 'note-type-2'
            ? movieColumns
            : undefined,
      isError: false,
      isLoading: false,
    }))
    createNoteImageValueFromFileMock.mockImplementation((file: File) =>
      Promise.resolve({
        altText: file.name,
        dataUrl: `data:${file.type};base64,${file.name}`,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
      })
    )

    render(<CreateUpdateDialog mode="create" onClose={onClose} open />)

    await selectSpecificNoteType('Books')

    const firstFile = new File(['first'], 'first.png', { type: 'image/png' })
    const secondFile = new File(['second'], 'second.png', { type: 'image/png' })

    fireEvent.drop(
      screen.getByRole('group', { name: 'Receipt image image drop zone' }),
      {
        dataTransfer: {
          files: [firstFile, secondFile],
        },
      }
    )

    fireEvent.click(
      await screen.findByRole('button', { name: 'Remove first.png' })
    )
    fireEvent.click(screen.getByRole('button', { name: 'Create note' }))

    await waitFor(() => {
      expect(createMutation.mutateAsync).toHaveBeenCalledWith({
        noteTypeId: 'note-type-1',
        values: {
          'receipt-column': [
            {
              altText: 'second.png',
              dataUrl: 'data:image/png;base64,second.png',
              fileName: 'second.png',
              mimeType: 'image/png',
              size: secondFile.size,
            },
          ],
        },
      })
    })
  })

  it('renders existing multi-image values when editing a note', () => {
    const multiImageColumns = bookColumns.map((column) =>
      column.id === 'receipt-column'
        ? { ...column, config: { isMultiImage: true } }
        : column
    )
    const note: NoteDto = {
      createdAt: '2026-07-07T10:00:00.000Z',
      id: 'note-1',
      noteTypeId: 'note-type-1',
      updatedAt: '2026-07-07T10:00:00.000Z',
      values: {
        'receipt-column': [
          {
            altText: 'First stored image',
            dataUrl: 'data:image/png;base64,first-stored',
            fileName: 'first-stored.png',
          },
          {
            altText: 'Second stored image',
            dataUrl: 'data:image/png;base64,second-stored',
            fileName: 'second-stored.png',
          },
        ],
      },
    }

    useNoteColumnsQueryMock.mockImplementation((noteTypeId?: string) => ({
      data:
        noteTypeId === 'note-type-1'
          ? multiImageColumns
          : noteTypeId === 'note-type-2'
            ? movieColumns
            : undefined,
      isError: false,
      isLoading: false,
    }))

    render(
      <CreateUpdateDialog mode="update" note={note} onClose={vi.fn()} open />
    )

    expect(screen.getByRole('img', { name: 'First stored image' })).toBeTruthy()
    expect(
      screen.getByRole('img', { name: 'Second stored image' })
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Remove first-stored.png' })
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Remove second-stored.png' })
    ).toBeTruthy()
  })

  it('keeps the note template fixed in edit mode, blocks invalid numbers, and preserves existing type fields', async () => {
    const note: NoteDto = {
      createdAt: '2026-07-07T10:00:00.000Z',
      id: 'note-1',
      noteTypeId: 'note-type-1',
      updatedAt: '2026-07-07T10:00:00.000Z',
      values: {
        'amount-column': 12.5,
        'due-date-column': '2026-07-08T00:30:00+02:00',
        'link-column': 'https://example.com/current',
        'title-column': 'Existing title',
      },
    }

    render(
      <CreateUpdateDialog mode="update" note={note} onClose={vi.fn()} open />
    )

    expect(
      screen
        .getByRole('combobox', { name: 'Note template' })
        .getAttribute('aria-disabled')
    ).toBe('true')
    expect((screen.getByLabelText('Due date') as HTMLInputElement).value).toBe(
      '2026-07-08'
    )

    fireEvent.change(screen.getByRole('textbox', { name: 'Amount' }), {
      target: { value: 'abc' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Enter a valid number.')).toBeTruthy()
    expect(updateMutation.mutateAsync).not.toHaveBeenCalled()

    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
      target: { value: 'Updated title' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Amount' }), {
      target: { value: '' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
        id: 'note-1',
        note: {
          values: {
            'amount-column': null,
            'due-date-column': '2026-07-08',
            'link-column': 'https://example.com/current',
            'receipt-column': null,
            'title-column': 'Updated title',
          },
        },
      })
    })
  })

  it('assigns source-filtered labels and submits unique label ids', async () => {
    const labelsColumn: ColumnDto = {
      config: {
        allowMultiple: true,
        sources: {
          includeShared: true,
          noteTypeIds: ['note-type-1'],
        },
      },
      createdAt: '2026-07-21T10:00:00.000Z',
      id: 'labels-column',
      noteTypeId: 'note-type-1',
      isDefault: false,
      isHidden: false,
      name: 'topics',
      sortOrder: 6,
      title: 'Topics',
      type: 'labels',
      updatedAt: '2026-07-21T10:00:00.000Z',
    }

    useNoteColumnsQueryMock.mockImplementation((noteTypeId?: string) => ({
      data:
        noteTypeId === 'note-type-1'
          ? [...bookColumns, labelsColumn]
          : noteTypeId === 'note-type-2'
            ? movieColumns
            : undefined,
      isError: false,
      isLoading: false,
    }))
    useLabelsQueryMock.mockReturnValue({
      data: [
        {
          color: '#0070F2',
          createdAt: '2026-07-21T10:00:00.000Z',
          id: 'shared-label',
          name: 'shared',
          noteTypeId: null,
          title: 'Shared label',
          updatedAt: '2026-07-21T10:00:00.000Z',
        },
        {
          color: '#188918',
          createdAt: '2026-07-21T10:00:00.000Z',
          id: 'book-label',
          name: 'book',
          noteTypeId: 'note-type-1',
          title: 'Book label',
          updatedAt: '2026-07-21T10:00:00.000Z',
        },
        {
          color: '#D20A0A',
          createdAt: '2026-07-21T10:00:00.000Z',
          id: 'movie-label',
          name: 'movie',
          noteTypeId: 'note-type-2',
          title: 'Movie label',
          updatedAt: '2026-07-21T10:00:00.000Z',
        },
      ],
      isError: false,
      isLoading: false,
    })

    render(<CreateUpdateDialog mode="create" onClose={vi.fn()} open />)

    await selectSpecificNoteType('Books')

    const labelsInput = screen.getByRole('combobox', { name: 'Topics' })
    fireEvent.mouseDown(labelsInput)
    expect(
      await screen.findByRole('option', { name: 'Shared label' })
    ).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Book label' })).toBeTruthy()
    expect(screen.queryByRole('option', { name: 'Movie label' })).toBeNull()
    fireEvent.click(screen.getByRole('option', { name: 'Shared label' }))

    fireEvent.mouseDown(labelsInput)
    fireEvent.click(await screen.findByRole('option', { name: 'Book label' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create note' }))

    await waitFor(() => {
      expect(createMutation.mutateAsync).toHaveBeenCalledWith({
        noteTypeId: 'note-type-1',
        values: {
          'labels-column': ['shared-label', 'book-label'],
        },
      })
    })
  })

  it('hydrates and clears a single-label field while editing', async () => {
    const labelsColumn: ColumnDto = {
      config: { allowMultiple: false, sources: null },
      createdAt: '2026-07-21T10:00:00.000Z',
      id: 'labels-column',
      noteTypeId: 'note-type-1',
      isDefault: false,
      isHidden: false,
      name: 'topic',
      sortOrder: 6,
      title: 'Topic',
      type: 'labels',
      updatedAt: '2026-07-21T10:00:00.000Z',
    }
    const note: NoteDto = {
      createdAt: '2026-07-21T10:00:00.000Z',
      id: 'note-with-label',
      noteTypeId: 'note-type-1',
      updatedAt: '2026-07-21T10:00:00.000Z',
      values: { 'labels-column': ['shared-label'] },
    }

    useNoteColumnsQueryMock.mockReturnValue({
      data: [...bookColumns, labelsColumn],
      isError: false,
      isLoading: false,
    })
    useLabelsQueryMock.mockReturnValue({
      data: [
        {
          color: '#0070F2',
          createdAt: '2026-07-21T10:00:00.000Z',
          id: 'shared-label',
          name: 'shared',
          noteTypeId: null,
          title: 'Shared label',
          updatedAt: '2026-07-21T10:00:00.000Z',
        },
      ],
      isError: false,
      isLoading: false,
    })

    render(
      <CreateUpdateDialog mode="update" note={note} onClose={vi.fn()} open />
    )

    expect(
      screen.getByText('Shared label').closest('.MuiChip-root')
    ).not.toBeNull()

    fireEvent.click(screen.getByTitle('Clear'))
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
        id: 'note-with-label',
        note: {
          values: expect.objectContaining({
            'labels-column': null,
          }),
        },
      })
    })
  })

  it('surfaces and removes a missing label assignment while editing', async () => {
    const labelsColumn: ColumnDto = {
      config: { allowMultiple: true, sources: null },
      createdAt: '2026-07-21T10:00:00.000Z',
      id: 'labels-column',
      noteTypeId: 'note-type-1',
      isDefault: false,
      isHidden: false,
      name: 'topics',
      sortOrder: 6,
      title: 'Topics',
      type: 'labels',
      updatedAt: '2026-07-21T10:00:00.000Z',
    }
    const note: NoteDto = {
      createdAt: '2026-07-21T10:00:00.000Z',
      id: 'note-with-missing-label',
      noteTypeId: 'note-type-1',
      updatedAt: '2026-07-21T10:00:00.000Z',
      values: { 'labels-column': ['missing-label'] },
    }

    useNoteColumnsQueryMock.mockReturnValue({
      data: [...bookColumns, labelsColumn],
      isError: false,
      isLoading: false,
    })

    render(
      <CreateUpdateDialog mode="update" note={note} onClose={vi.fn()} open />
    )

    const missingChip = screen
      .getByText('Unavailable label')
      .closest('.MuiChip-root')
    expect(missingChip).not.toBeNull()

    const deleteIcon = missingChip?.querySelector('[data-testid="CancelIcon"]')
    expect(deleteIcon).not.toBeNull()
    fireEvent.click(deleteIcon as Element)
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
        id: 'note-with-missing-label',
        note: {
          values: expect.objectContaining({
            'labels-column': null,
          }),
        },
      })
    })
  })
})
