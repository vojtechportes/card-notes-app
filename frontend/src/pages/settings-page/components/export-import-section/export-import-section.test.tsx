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
} from '../../../../types/api'
import '../../../../i18n'
import { AppProviders } from '../../../../components/app-providers/app-providers'
import { ExportImportSection } from './export-import-section'

const useExportDataMutationMock = vi.hoisted(() => vi.fn())
const useImportDataMutationMock = vi.hoisted(() => vi.fn())

vi.mock('../../hooks/use-export-data-mutation', () => ({
  useExportDataMutation: useExportDataMutationMock,
}))

vi.mock('../../hooks/use-import-data-mutation', () => ({
  useImportDataMutation: useImportDataMutationMock,
}))

const exportData: ExportImportDataDto = {
  columns: [],
  exportedAt: '2026-07-08T10:00:00.000Z',
  generalSettings: {
    cardFieldDisplayCount: 3,
    textTruncationLength: 120,
    mergeDateTimeFields: false,
  },
  notes: [],
  version: 1,
}

const importResult: ImportResultDto = {
  importedColumns: 2,
  importedNotes: 4,
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

  it('shows export failure feedback when exporting rejects', async () => {
    exportMutation.mutateAsync.mockRejectedValueOnce(new Error('export failed'))
    renderExportImportSection()

    fireEvent.click(screen.getByRole('button', { name: 'Export JSON' }))

    expect(
      await screen.findByText('App data could not be exported right now.')
    ).toBeTruthy()
  })

  it('uploads the selected JSON export file and shows the result summary', async () => {
    renderExportImportSection()
    const file = new File([JSON.stringify(exportData)], 'card-notes-backup.json', {
      type: 'application/json',
    })

    fireEvent.change(screen.getByLabelText('JSON import file'), {
      target: {
        files: [file],
      },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Import JSON' }))

    await waitFor(() => {
      expect(importMutation.mutateAsync).toHaveBeenCalledWith(file)
    })

    expect(
      await screen.findByText(
        'Import completed. Added 2 columns and 4 notes. General settings were updated.'
      )
    ).toBeTruthy()
    expect(
      screen.getByText(
        'Select a JSON export file to import. Existing notes stay in place and imported notes are appended.'
      )
    ).toBeTruthy()
  })

  it('keeps the import button disabled until a file is selected', () => {
    renderExportImportSection()

    expect(
      screen.getByRole('button', { name: 'Import JSON' }).hasAttribute('disabled')
    ).toBe(true)
    expect(importMutation.mutateAsync).not.toHaveBeenCalled()
  })

  it('shows import failure feedback when the backend rejects the file', async () => {
    importMutation.mutateAsync.mockRejectedValueOnce(new Error('import failed'))
    renderExportImportSection()

    fireEvent.change(screen.getByLabelText('JSON import file'), {
      target: {
        files: [
          new File([JSON.stringify(exportData)], 'card-notes-backup.json', {
            type: 'application/json',
          }),
        ],
      },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Import JSON' }))

    expect(
      await screen.findByText(
        'The selected data could not be imported right now.'
      )
    ).toBeTruthy()
  })

  it('shows loading button labels when export or import is pending', () => {
    useExportDataMutationMock.mockReturnValue({
      isPending: true,
      mutateAsync: vi.fn(),
    })
    useImportDataMutationMock.mockReturnValue({
      isPending: true,
      mutateAsync: vi.fn(),
    })

    renderExportImportSection()

    expect(
      screen
        .getByRole('button', { name: 'Exporting...' })
        .hasAttribute('disabled')
    ).toBe(true)
    expect(
      screen
        .getByRole('button', { name: 'Importing...' })
        .hasAttribute('disabled')
    ).toBe(true)
  })
})

