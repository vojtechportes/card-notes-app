import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import '../../../../i18n'
import { AppProviders } from '../../../../components/app-providers/app-providers'
import { NoteLabelsSection } from './note-labels-section'

const useLabelsQueryMock = vi.hoisted(() => vi.fn())
const useNoteTypesQueryMock = vi.hoisted(() => vi.fn())
const useCreateLabelMutationMock = vi.hoisted(() => vi.fn())
const useUpdateLabelMutationMock = vi.hoisted(() => vi.fn())
const useDeleteLabelMutationMock = vi.hoisted(() => vi.fn())

vi.mock('../../hooks/use-labels-query', () => ({
  useLabelsQuery: useLabelsQueryMock,
}))

vi.mock('../../hooks/use-note-types-query', () => ({
  useNoteTypesQuery: useNoteTypesQueryMock,
}))

vi.mock('../../hooks/use-create-label-mutation', () => ({
  useCreateLabelMutation: useCreateLabelMutationMock,
}))

vi.mock('../../hooks/use-update-label-mutation', () => ({
  useUpdateLabelMutation: useUpdateLabelMutationMock,
}))

vi.mock('../../hooks/use-delete-label-mutation', () => ({
  useDeleteLabelMutation: useDeleteLabelMutationMock,
}))

const labels = [
  {
    color: '#D20A0A',
    createdAt: '2026-07-20T10:00:00.000Z',
    id: 'label-1',
    name: 'urgent',
    noteTypeId: null,
    title: 'Urgent',
    updatedAt: '2026-07-20T11:00:00.000Z',
  },
  {
    color: '#188918',
    createdAt: '2026-07-21T10:00:00.000Z',
    id: 'label-2',
    name: 'completed',
    noteTypeId: 'note-type-1',
    title: 'Completed',
    updatedAt: '2026-07-21T11:00:00.000Z',
  },
]

const noteTypes = [
  {
    createdAt: '2026-07-19T10:00:00.000Z',
    id: 'note-type-1',
    title: 'Projects',
    updatedAt: '2026-07-19T10:00:00.000Z',
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
  useLabelsQueryMock.mockReturnValue({
    data: labels,
    isError: false,
    isLoading: false,
  })
  useNoteTypesQueryMock.mockReturnValue({
    data: noteTypes,
    isError: false,
    isLoading: false,
  })
  createMutation.mutateAsync.mockResolvedValue(labels[0])
  updateMutation.mutateAsync.mockResolvedValue(labels[1])
  deleteMutation.mutateAsync.mockResolvedValue({
    affectedNoteValuesCount: 2,
    deletedLabelId: 'label-1',
  })
  useCreateLabelMutationMock.mockReturnValue(createMutation)
  useUpdateLabelMutationMock.mockReturnValue(updateMutation)
  useDeleteLabelMutationMock.mockReturnValue(deleteMutation)
})

afterEach(() => {
  cleanup()
})

const renderSection = () => {
  return render(
    <AppProviders>
      <NoteLabelsSection />
    </AppProviders>
  )
}

describe('NoteLabelsSection', () => {
  it('renders requested grid columns, sources, dates, and filled small label chips', () => {
    renderSection()

    expect(
      screen.getByRole('columnheader', { name: 'Label title' })
    ).toBeTruthy()
    expect(
      screen.getByRole('columnheader', { name: 'Label name' })
    ).toBeTruthy()
    expect(
      screen.getByRole('columnheader', { name: 'Note template' })
    ).toBeTruthy()
    expect(
      screen.getByRole('columnheader', { name: 'Created at' })
    ).toBeTruthy()
    expect(
      screen.getByRole('columnheader', { name: 'Updated at' })
    ).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeTruthy()
    expect(screen.getByText('Shared')).toBeTruthy()
    expect(screen.getByText('Projects')).toBeTruthy()

    const urgentChip = screen.getByText('Urgent').closest('.MuiChip-root')
    expect(urgentChip?.className).toContain('MuiChip-filled')
    expect(urgentChip?.className).toContain('MuiChip-sizeSmall')
  })

  it('creates a shared label and updates the live preview', async () => {
    renderSection()

    fireEvent.click(screen.getByRole('button', { name: 'Add label' }))
    fireEvent.change(screen.getByLabelText('Label title'), {
      target: { value: 'Needs review' },
    })
    fireEvent.change(screen.getByLabelText('Label name'), {
      target: { value: 'needs-review' },
    })
    fireEvent.change(screen.getByLabelText('Color'), {
      target: { value: '#C35500' },
    })

    expect(screen.getByText('Needs review')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Create label' }))

    await waitFor(() => {
      expect(createMutation.mutateAsync).toHaveBeenCalledWith({
        color: '#C35500',
        name: 'needs-review',
        noteTypeId: null,
        title: 'Needs review',
      })
    })
  })

  it('embeds the color picker and synchronizes picker changes', async () => {
    renderSection()

    fireEvent.click(screen.getByRole('button', { name: 'Add label' }))

    const picker = screen.getByLabelText('Choose label color')
    expect(picker.closest('.MuiInputAdornment-root')).not.toBeNull()
    expect((screen.getByLabelText('Color') as HTMLInputElement).value).toBe(
      '#0070F2'
    )

    fireEvent.change(screen.getByLabelText('Label title'), {
      target: { value: 'Selected color' },
    })
    fireEvent.change(screen.getByLabelText('Label name'), {
      target: { value: 'selected-color' },
    })
    fireEvent.change(picker, { target: { value: '#c35500' } })

    expect((screen.getByLabelText('Color') as HTMLInputElement).value).toBe(
      '#C35500'
    )
    fireEvent.click(screen.getByRole('button', { name: 'Create label' }))

    await waitFor(() => {
      expect(createMutation.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ color: '#C35500' })
      )
    })
  })

  it('updates a template-specific label', async () => {
    renderSection()

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit label' })[1])
    fireEvent.change(screen.getByLabelText('Label title'), {
      target: { value: 'Finished' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save label' }))

    await waitFor(() => {
      expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
        id: 'label-2',
        label: {
          color: '#188918',
          name: 'completed',
          noteTypeId: 'note-type-1',
          title: 'Finished',
        },
      })
    })
  })

  it('validates required values before creating a label', async () => {
    renderSection()

    fireEvent.click(screen.getByRole('button', { name: 'Add label' }))
    fireEvent.change(screen.getByLabelText('Color'), {
      target: { value: '' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create label' }))

    expect(await screen.findByText('Label title is required.')).toBeTruthy()
    expect(screen.getByText('Label name is required.')).toBeTruthy()
    expect(createMutation.mutateAsync).not.toHaveBeenCalled()
  })

  it('requires destructive confirmation before deleting a label', async () => {
    renderSection()

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete label' })[0])

    const dialog = screen.getByRole('dialog', { name: 'Delete label' })
    expect(
      within(dialog).getByText(/removes the label from every note/)
    ).toBeTruthy()
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Delete label' })
    )

    await waitFor(() => {
      expect(deleteMutation.mutateAsync).toHaveBeenCalledWith('label-1')
    })
  })

  it('renders the empty and error states', () => {
    useLabelsQueryMock.mockReturnValueOnce({
      data: [],
      isError: false,
      isLoading: false,
    })
    const { unmount } = renderSection()

    expect(screen.getByText(/No labels are configured yet/)).toBeTruthy()
    unmount()

    useLabelsQueryMock.mockReturnValueOnce({
      data: undefined,
      isError: true,
      isLoading: false,
    })
    renderSection()

    expect(
      screen.getByText('Labels could not be loaded right now.')
    ).toBeTruthy()
  })

  it('maps a selected note template source into the create payload', async () => {
    renderSection()

    fireEvent.click(screen.getByRole('button', { name: 'Add label' }))
    fireEvent.change(screen.getByLabelText('Label title'), {
      target: { value: 'Project label' },
    })
    fireEvent.change(screen.getByLabelText('Label name'), {
      target: { value: 'project-label' },
    })
    fireEvent.mouseDown(screen.getByLabelText('Source'))
    fireEvent.click(screen.getByRole('option', { name: 'Projects' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create label' }))

    await waitFor(() => {
      expect(createMutation.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ noteTypeId: 'note-type-1' })
      )
    })
  })

  it('shows invalid color format feedback', async () => {
    renderSection()

    fireEvent.click(screen.getByRole('button', { name: 'Add label' }))
    fireEvent.change(screen.getByLabelText('Label title'), {
      target: { value: 'Invalid color' },
    })
    fireEvent.change(screen.getByLabelText('Label name'), {
      target: { value: 'invalid-color' },
    })
    fireEvent.change(screen.getByLabelText('Color'), {
      target: { value: 'blue' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create label' }))

    expect(
      await screen.findByText('Enter a color in #RRGGBB format.')
    ).toBeTruthy()
    expect(createMutation.mutateAsync).not.toHaveBeenCalled()
  })

  it('shows the localized source-scoped name conflict error', async () => {
    createMutation.mutateAsync.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 409 },
    })
    renderSection()

    fireEvent.click(screen.getByRole('button', { name: 'Add label' }))
    fireEvent.change(screen.getByLabelText('Label title'), {
      target: { value: 'Urgent duplicate' },
    })
    fireEvent.change(screen.getByLabelText('Label name'), {
      target: { value: 'urgent' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create label' }))

    expect(
      await screen.findByText(
        'That label name is already used by the selected source.'
      )
    ).toBeTruthy()
  })

  it('cancels label deletion without calling the mutation', async () => {
    renderSection()

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete label' })[0])
    const dialog = screen.getByRole('dialog', { name: 'Delete label' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Delete label' })).toBeNull()
    })
    expect(deleteMutation.mutateAsync).not.toHaveBeenCalled()
  })

  it('shows an error when label deletion fails', async () => {
    deleteMutation.mutateAsync.mockRejectedValueOnce(new Error('failed'))
    renderSection()

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete label' })[0])
    const dialog = screen.getByRole('dialog', { name: 'Delete label' })
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Delete label' })
    )

    expect(
      await screen.findByText('The label could not be deleted. Try again.')
    ).toBeTruthy()
  })
})
