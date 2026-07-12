import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  ExportImportDataDto,
  ImportResultDto,
  NoteTypeDto,
} from '../../../../types/api'
import '../../../../i18n'
import { AppProviders } from '../../../../components/app-providers/app-providers'
import { ExportImportSection } from './export-import-section'

const useExportDataMutationMock = vi.hoisted(() => vi.fn())
const useImportDataMutationMock = vi.hoisted(() => vi.fn())
const useNoteTypesQueryMock = vi.hoisted(() => vi.fn())

vi.mock('../../hooks/use-export-data-mutation', () => ({
  useExportDataMutation: useExportDataMutationMock,
}))

vi.mock('../../hooks/use-import-data-mutation', () => ({
  useImportDataMutation: useImportDataMutationMock,
}))

vi.mock('../../hooks/use-note-types-query', () => ({
  useNoteTypesQuery: useNoteTypesQueryMock,
}))

const noteTypes: NoteTypeDto[] = [
  {
    createdAt: '2026-07-08T10:00:00.000Z',
    id: 'note-type-1',
    title: 'Recipes',
    updatedAt: '2026-07-08T10:00:00.000Z',
  },
]

const exportData: ExportImportDataDto = {
  columns: [],
  exportedAt: '2026-07-08T10:00:00.000Z',
  generalSettings: {
    cardFieldDisplayCount: 3,
    textTruncationLength: 120,
    mergeDateTimeFields: false,
  },
  notes: [],
  noteTypes,
  version: 2,
}

const importResult: ImportResultDto = {
  importedColumns: 2,
  importedNotes: 4,
  unmatchedFields: [],
  updatedGeneralSettings: true,
}

const exportMutation = {
  isPending: false,
  mutateAsync: vi.fn(),
}

const importMutation = {
  isPending: false,
  mutateAsync: vi.fn(),
}

const createObjectUrlMock = vi.fn(() => 'blob:card-notes-export')
const revokeObjectUrlMock = vi.fn()
const clickMock = vi.fn()
const originalCreateElement = document.createElement.bind(document)
let createdAnchor: HTMLAnchorElement | null = null

const renderExportImportSection = () => {
  return render(
    <AppProviders>
      <ExportImportSection />
    </AppProviders>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  createdAnchor = null

  exportMutation.isPending = false
  exportMutation.mutateAsync.mockResolvedValue(exportData)
  importMutation.isPending = false
  importMutation.mutateAsync.mockResolvedValue(importResult)

  useExportDataMutationMock.mockReturnValue(exportMutation)
  useImportDataMutationMock.mockReturnValue(importMutation)
  useNoteTypesQueryMock.mockReturnValue({
    data: noteTypes,
    isError: false,
    isLoading: false,
  })

  Object.defineProperty(globalThis.URL, 'createObjectURL', {
    configurable: true,
    value: createObjectUrlMock,
  })

  Object.defineProperty(globalThis.URL, 'revokeObjectURL', {
    configurable: true,
    value: revokeObjectUrlMock,
  })

  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(
    (callback: FrameRequestCallback) => {
      callback(0)
      return 0
    }
  )

  vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
    const element = originalCreateElement(tagName)

    if (tagName === 'a') {
      createdAnchor = element as HTMLAnchorElement
      Object.defineProperty(element, 'click', {
        configurable: true,
        value: clickMock,
      })
    }

    return element
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ExportImportSection', () => {
  it('exports app data and starts a JSON download', async () => {
    renderExportImportSection()

    fireEvent.click(screen.getByRole('button', { name: 'Export JSON' }))

    await waitFor(() => {
      expect(exportMutation.mutateAsync).toHaveBeenCalledWith()
    })

    expect(createObjectUrlMock).toHaveBeenCalledTimes(1)
    expect(createdAnchor?.download).toBe(
      'card-notes-export-2026-07-08T10-00-00-000Z.json'
    )
    expect(clickMock).toHaveBeenCalledTimes(1)
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:card-notes-export')
    expect(await screen.findByText('JSON export was downloaded.')).toBeTruthy()
  })

  it('imports a selected JSON file without forcing a target note type', async () => {
    renderExportImportSection()
    const file = new File(
      [JSON.stringify(exportData)],
      'card-notes-backup.json',
      {
        type: 'application/json',
      }
    )

    fireEvent.change(screen.getByLabelText('Import file'), {
      target: {
        files: [file],
      },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Import file' }))

    await waitFor(() => {
      expect(importMutation.mutateAsync).toHaveBeenCalledWith({
        file,
        targetNoteTypeId: undefined,
      })
    })

    expect(
      await screen.findByText(
        'Import completed. Processed 2 fields and appended 4 notes. General settings were updated.'
      )
    ).toBeTruthy()
  })

  it('requires a target note type before importing an xlsx file', async () => {
    renderExportImportSection()
    const file = new File(['xlsx-content'], 'card-notes.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    fireEvent.change(screen.getByLabelText('Import file'), {
      target: {
        files: [file],
      },
    })

    expect(
      screen
        .getByRole('button', { name: 'Import file' })
        .hasAttribute('disabled')
    ).toBe(true)

    fireEvent.mouseDown(
      screen.getByRole('combobox', { name: 'Import target note type' })
    )
    fireEvent.click(await screen.findByRole('option', { name: 'Recipes' }))

    expect(
      screen
        .getByRole('button', { name: 'Import file' })
        .hasAttribute('disabled')
    ).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Import file' }))

    await waitFor(() => {
      expect(importMutation.mutateAsync).toHaveBeenCalledWith({
        file,
        targetNoteTypeId: 'note-type-1',
      })
    })
  })

  it('clears the selected target note type when the user switches files', async () => {
    renderExportImportSection()

    fireEvent.change(screen.getByLabelText('Import file'), {
      target: {
        files: [
          new File(['xlsx-content'], 'card-notes.xlsx', {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          }),
        ],
      },
    })

    fireEvent.mouseDown(
      screen.getByRole('combobox', { name: 'Import target note type' })
    )
    fireEvent.click(await screen.findByRole('option', { name: 'Recipes' }))

    fireEvent.change(screen.getByLabelText('Import file'), {
      target: {
        files: [
          new File([JSON.stringify(exportData)], 'card-notes-backup.json', {
            type: 'application/json',
          }),
        ],
      },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Import file' }))

    await waitFor(() => {
      expect(importMutation.mutateAsync).toHaveBeenCalledWith({
        file: expect.any(File),
        targetNoteTypeId: undefined,
      })
    })
  })
  it('shows unmatched field feedback returned from the backend', async () => {
    importMutation.mutateAsync.mockResolvedValueOnce({
      ...importResult,
      unmatchedFields: [
        {
          name: 'rating',
          noteTypeTitle: 'Books',
          title: 'Rating',
          type: 'number',
        },
      ],
    })

    renderExportImportSection()

    fireEvent.change(screen.getByLabelText('Import file'), {
      target: {
        files: [
          new File([JSON.stringify(exportData)], 'card-notes-backup.json', {
            type: 'application/json',
          }),
        ],
      },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Import file' }))

    expect(
      await screen.findByText(
        'Some imported fields could not be matched and were skipped:'
      )
    ).toBeTruthy()
    expect(screen.getByText('Books / Rating (rating, Number)')).toBeTruthy()
  })
})
