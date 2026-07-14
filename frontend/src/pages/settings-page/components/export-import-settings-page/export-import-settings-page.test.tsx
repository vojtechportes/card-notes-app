import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../../../../i18n'
import { ExportImportSettingsPage } from './export-import-settings-page'

vi.mock('../export-import-section/export-import-section', () => ({
  ExportImportSection: () => (
    <section aria-label="Export and import workflow" />
  ),
}))

describe('ExportImportSettingsPage', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the localized page title and description', () => {
    render(<ExportImportSettingsPage />)

    expect(
      screen.getByRole('heading', { level: 2, name: 'Export / Import' })
    ).toBeTruthy()
    expect(
      screen.getByText(
        'Move data in and out of NoteStack with JSON backups or XLSX imports while keeping existing notes intact.'
      )
    ).toBeTruthy()
  })

  it('keeps the export and import workflow on the page', () => {
    render(<ExportImportSettingsPage />)

    expect(
      screen.getByRole('region', { name: 'Export and import workflow' })
    ).toBeTruthy()
  })
})
