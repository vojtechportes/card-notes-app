import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '../../i18n'
import { AppProviders } from '../../components/app-providers/app-providers'
import { SettingsPage } from './settings-page'

const useNoteTypesQueryMock = vi.hoisted(() => vi.fn())
const useNoteTypeDetailQueryMock = vi.hoisted(() => vi.fn())
const useCreateNoteTypeMutationMock = vi.hoisted(() => vi.fn())
const useUpdateNoteTypeMutationMock = vi.hoisted(() => vi.fn())
const useDeleteNoteTypeMutationMock = vi.hoisted(() => vi.fn())
const useNoteColumnsQueryMock = vi.hoisted(() => vi.fn())
const useCreateColumnMutationMock = vi.hoisted(() => vi.fn())
const useUpdateColumnMutationMock = vi.hoisted(() => vi.fn())
const useReorderColumnsMutationMock = vi.hoisted(() => vi.fn())
const useDeleteColumnMutationMock = vi.hoisted(() => vi.fn())
const useGeneralSettingsQueryMock = vi.hoisted(() => vi.fn())
const useUpdateGeneralSettingsMutationMock = vi.hoisted(() => vi.fn())
const useExportDataMutationMock = vi.hoisted(() => vi.fn())
const useImportDataMutationMock = vi.hoisted(() => vi.fn())
const useDeleteAllNotesMutationMock = vi.hoisted(() => vi.fn())
const useUpdaterStateMock = vi.hoisted(() => vi.fn())

vi.mock('./hooks/use-note-types-query', () => ({
  useNoteTypesQuery: useNoteTypesQueryMock,
}))

vi.mock('./hooks/use-note-type-detail-query', () => ({
  useNoteTypeDetailQuery: useNoteTypeDetailQueryMock,
}))

vi.mock('./hooks/use-create-note-type-mutation', () => ({
  useCreateNoteTypeMutation: useCreateNoteTypeMutationMock,
}))

vi.mock('./hooks/use-update-note-type-mutation', () => ({
  useUpdateNoteTypeMutation: useUpdateNoteTypeMutationMock,
}))

vi.mock('./hooks/use-delete-note-type-mutation', () => ({
  useDeleteNoteTypeMutation: useDeleteNoteTypeMutationMock,
}))

vi.mock('./hooks/use-note-columns-query', () => ({
  useNoteColumnsQuery: useNoteColumnsQueryMock,
}))

vi.mock('./hooks/use-create-column-mutation', () => ({
  useCreateColumnMutation: useCreateColumnMutationMock,
}))

vi.mock('./hooks/use-update-column-mutation', () => ({
  useUpdateColumnMutation: useUpdateColumnMutationMock,
}))

vi.mock('./hooks/use-reorder-columns-mutation', () => ({
  useReorderColumnsMutation: useReorderColumnsMutationMock,
}))

vi.mock('./hooks/use-delete-column-mutation', () => ({
  useDeleteColumnMutation: useDeleteColumnMutationMock,
}))

vi.mock('./hooks/use-general-settings-query', () => ({
  useGeneralSettingsQuery: useGeneralSettingsQueryMock,
}))

vi.mock('./hooks/use-update-general-settings-mutation', () => ({
  useUpdateGeneralSettingsMutation: useUpdateGeneralSettingsMutationMock,
}))

vi.mock('./hooks/use-export-data-mutation', () => ({
  useExportDataMutation: useExportDataMutationMock,
}))

vi.mock('./hooks/use-import-data-mutation', () => ({
  useImportDataMutation: useImportDataMutationMock,
}))

vi.mock('./hooks/use-delete-all-notes-mutation', () => ({
  useDeleteAllNotesMutation: useDeleteAllNotesMutationMock,
}))

vi.mock('./hooks/use-updater-state/use-updater-state', () => ({
  useUpdaterState: useUpdaterStateMock,
}))

beforeEach(() => {
  useNoteTypesQueryMock.mockReturnValue({
    data: [
      {
        createdAt: '2026-07-08T10:00:00.000Z',
        id: 'note-type-1',
        title: 'Projects',
        updatedAt: '2026-07-08T10:00:00.000Z',
      },
    ],
    isError: false,
    isLoading: false,
  })
  useNoteTypeDetailQueryMock.mockReturnValue({
    data: undefined,
    isError: false,
    isLoading: false,
  })
  useCreateNoteTypeMutationMock.mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  })
  useUpdateNoteTypeMutationMock.mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  })
  useDeleteNoteTypeMutationMock.mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  })
  useNoteColumnsQueryMock.mockReturnValue({
    data: [],
    isError: false,
    isLoading: false,
  })
  useCreateColumnMutationMock.mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  })
  useUpdateColumnMutationMock.mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  })
  useReorderColumnsMutationMock.mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  })
  useDeleteColumnMutationMock.mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  })
  useGeneralSettingsQueryMock.mockReturnValue({
    data: {
      cardFieldDisplayCount: null,
      textTruncationLength: null,
      mergeDateTimeFields: null,
    },
    isError: false,
    isLoading: false,
  })
  useUpdateGeneralSettingsMutationMock.mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  })
  useExportDataMutationMock.mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  })
  useImportDataMutationMock.mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  })
  useDeleteAllNotesMutationMock.mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  })
  useUpdaterStateMock.mockReturnValue({
    checkForUpdates: vi.fn(),
    downloadUpdate: vi.fn(),
    installUpdate: vi.fn(),
    isLoading: false,
    isUpdaterAvailable: false,
    state: {
      currentVersion: 'Unavailable',
      kind: 'unavailable',
      reason: 'updater-disabled',
    },
  })
})

describe('SettingsPage', () => {
  it('renders each top-level settings section as its own component shell', () => {
    render(
      <AppProviders>
        <SettingsPage />
      </AppProviders>
    )

    expect(
      screen.getByRole('heading', { level: 3, name: 'Note types' })
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { level: 3, name: 'General' })
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { level: 3, name: 'Updates' })
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { level: 3, name: 'Export / Import' })
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { level: 3, name: 'Danger Zone' })
    ).toBeTruthy()
  })
})
