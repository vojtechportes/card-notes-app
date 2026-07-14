import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../../../../i18n'
import { AppProviders } from '../../../../components/app-providers/app-providers'
import { DataManagementSettingsPage } from './data-management-settings-page'

const useDeleteAllNotesMutationMock = vi.hoisted(() => vi.fn())

vi.mock('../../hooks/use-delete-all-notes-mutation', () => ({
  useDeleteAllNotesMutation: useDeleteAllNotesMutationMock,
}))

const deleteAllNotesMutation = {
  isPending: false,
  mutateAsync: vi.fn(),
}

const renderDataManagementSettingsPage = () => {
  return render(
    <AppProviders>
      <DataManagementSettingsPage />
    </AppProviders>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  deleteAllNotesMutation.isPending = false
  deleteAllNotesMutation.mutateAsync.mockResolvedValue({ deletedCount: 4 })
  useDeleteAllNotesMutationMock.mockReturnValue(deleteAllNotesMutation)
})

describe('DataManagementSettingsPage', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the localized page title and description', () => {
    renderDataManagementSettingsPage()

    expect(
      screen.getByRole('heading', { level: 2, name: 'Data Management' })
    ).toBeTruthy()
    expect(
      screen.getByText(
        'Review destructive and maintenance data actions for your local notes, with guarded controls for anything permanent.'
      )
    ).toBeTruthy()
  })

  it('keeps destructive controls inside the internal Danger Zone section', () => {
    renderDataManagementSettingsPage()

    expect(screen.getByRole('heading', { name: 'Danger Zone' })).toBeTruthy()
    expect(
      screen.getByText(
        'Permanently remove every note across every note template from your local database.'
      )
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Delete all notes' })
    ).toBeTruthy()
  })

  it('requires confirmation before deleting all notes from Data Management', async () => {
    renderDataManagementSettingsPage()

    fireEvent.click(screen.getByRole('button', { name: 'Delete all notes' }))

    const dialog = await screen.findByRole('dialog')

    expect(
      within(dialog).getByRole('heading', { name: 'Delete all notes' })
    ).toBeTruthy()
    expect(deleteAllNotesMutation.mutateAsync).not.toHaveBeenCalled()

    fireEvent.click(
      within(dialog).getAllByRole('button', { name: 'Delete all notes' })[0]
    )

    await waitFor(() => {
      expect(deleteAllNotesMutation.mutateAsync).toHaveBeenCalledTimes(1)
    })
    expect(await screen.findByText('Deleted 4 notes.')).toBeTruthy()
  })
})
