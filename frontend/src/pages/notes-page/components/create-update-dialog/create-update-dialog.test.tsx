import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ColumnDto, NoteDto } from '../../../../types/api'
import '../../../../i18n'
import { CreateUpdateDialog } from './create-update-dialog'

const useNoteColumnsQueryMock = vi.hoisted(() => vi.fn())
const useCreateNoteMutationMock = vi.hoisted(() => vi.fn())
const useUpdateNoteMutationMock = vi.hoisted(() => vi.fn())
const createNoteImageValueFromFileMock = vi.hoisted(() => vi.fn())

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

const columns: ColumnDto[] = [
  {
    config: null,
    createdAt: '2026-07-07T10:00:00.000Z',
    id: 'created-column',
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
    isDefault: false,
    isHidden: false,
    name: 'receiptImage',
    sortOrder: 5,
    title: 'Receipt image',
    type: 'image',
    updatedAt: '2026-07-07T10:00:00.000Z',
  },
  {
    config: null,
    createdAt: '2026-07-07T10:00:00.000Z',
    id: 'hidden-column',
    isDefault: false,
    isHidden: true,
    name: 'internalNote',
    sortOrder: 6,
    title: 'Internal note',
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

beforeEach(() => {
  vi.clearAllMocks()
  useNoteColumnsQueryMock.mockReturnValue({
    data: columns,
    isError: false,
    isLoading: false,
  })
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
  it('renders editable fields in sort order and skips hidden or system columns', () => {
    render(<CreateUpdateDialog mode="create" onClose={vi.fn()} open />)

    expect(screen.getByRole('textbox', { name: 'Title' })).toBeTruthy()
    expect(screen.getByLabelText('Due date')).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Amount' })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Reference link' })).toBeTruthy()
    expect(
      screen.getByRole('group', { name: 'Receipt image image drop zone' })
    ).toBeTruthy()
    expect(screen.queryByLabelText('Created at')).toBeNull()
    expect(screen.queryByRole('textbox', { name: 'Internal note' })).toBeNull()
  })

  it('preserves in-progress values when note columns refetch while the dialog stays open', () => {
    let currentColumns = columns
    const onClose = vi.fn()

    useNoteColumnsQueryMock.mockImplementation(() => ({
      data: currentColumns,
      isError: false,
      isLoading: false,
    }))

    const { rerender } = render(
      <CreateUpdateDialog mode="create" onClose={onClose} open />
    )

    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
      target: { value: 'Draft note' },
    })

    currentColumns = [...columns]
    rerender(<CreateUpdateDialog mode="create" onClose={onClose} open />)

    expect(
      (screen.getByRole('textbox', { name: 'Title' }) as HTMLInputElement).value
    ).toBe('Draft note')
  })

  it('switches from create mode to update mode without reusing the create submit handler', async () => {
    const createOnClose = vi.fn()
    const note: NoteDto = {
      createdAt: '2026-07-07T10:00:00.000Z',
      id: 'note-2',
      updatedAt: '2026-07-07T10:00:00.000Z',
      values: {
        'title-column': 'Original title',
      },
    }

    const { rerender } = render(
      <CreateUpdateDialog mode="create" onClose={createOnClose} open />
    )

    rerender(
      <CreateUpdateDialog
        mode="update"
        note={note}
        onClose={createOnClose}
        open
      />
    )

    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
      target: { value: 'Updated title' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
        id: 'note-2',
        note: {
          values: {
            'amount-column': null,
            'due-date-column': null,
            'link-column': null,
            'receipt-column': null,
            'title-column': 'Updated title',
          },
        },
      })
    })

    expect(createMutation.mutateAsync).not.toHaveBeenCalled()
  })
  it('submits create values keyed by column id and supports image drop', async () => {
    const onClose = vi.fn()
    render(<CreateUpdateDialog mode="create" onClose={onClose} open />)

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

  it('hydrates update values, normalizes stored dates, blocks invalid numbers, and sends null for cleared fields', async () => {
    const note: NoteDto = {
      createdAt: '2026-07-07T10:00:00.000Z',
      id: 'note-1',
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

    const titleInput = screen.getByRole('textbox', {
      name: 'Title',
    }) as HTMLInputElement
    const amountInput = screen.getByRole('textbox', {
      name: 'Amount',
    }) as HTMLInputElement
    const dueDateInput = screen.getByLabelText('Due date') as HTMLInputElement

    expect(titleInput.value).toBe('Existing title')
    expect(amountInput.value).toBe('12.5')
    expect(dueDateInput.value).toBe('2026-07-08')

    fireEvent.change(amountInput, {
      target: { value: 'abc' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Enter a valid number.')).toBeTruthy()
    expect(updateMutation.mutateAsync).not.toHaveBeenCalled()

    fireEvent.change(titleInput, {
      target: { value: '' },
    })
    fireEvent.change(amountInput, {
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
            'title-column': null,
          },
        },
      })
    })
  })
})
