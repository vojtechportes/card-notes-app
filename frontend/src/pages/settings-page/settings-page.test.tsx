import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '../../i18n'
import { SettingsPage } from './settings-page'

vi.mock('./components/general-settings-page/general-settings-page', () => ({
  GeneralSettingsPage: () => <h3>General page</h3>,
}))

vi.mock(
  './components/note-templates-settings-page/note-templates-settings-page',
  () => ({
    NoteTemplatesSettingsPage: () => <h3>Note templates page</h3>,
  })
)

vi.mock(
  './components/export-import-settings-page/export-import-settings-page',
  () => ({
    ExportImportSettingsPage: () => <h3>Export / Import page</h3>,
  })
)

vi.mock(
  './components/data-management-settings-page/data-management-settings-page',
  () => ({
    DataManagementSettingsPage: () => <h3>Data Management page</h3>,
  })
)

const renderSettingsRoute = (route: string) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/settings/*" element={<SettingsPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('SettingsPage', () => {
  afterEach(() => {
    cleanup()
  })

  it('redirects the settings landing route to general settings', async () => {
    renderSettingsRoute('/settings')

    expect(
      await screen.findByRole('heading', { level: 3, name: 'General page' })
    ).toBeTruthy()
  })

  it('renders the general settings sub-page', () => {
    renderSettingsRoute('/settings/general')

    expect(
      screen.getByRole('heading', { level: 3, name: 'General page' })
    ).toBeTruthy()
  })

  it('renders the note templates sub-page and detail route', () => {
    renderSettingsRoute('/settings/note-templates/note-type-1')

    expect(
      screen.getByRole('heading', { level: 3, name: 'Note templates page' })
    ).toBeTruthy()
  })

  it('renders the export import sub-page', () => {
    renderSettingsRoute('/settings/export-import')

    expect(
      screen.getByRole('heading', { level: 3, name: 'Export / Import page' })
    ).toBeTruthy()
  })

  it('renders the data management sub-page', () => {
    renderSettingsRoute('/settings/data-management')

    expect(
      screen.getByRole('heading', { level: 3, name: 'Data Management page' })
    ).toBeTruthy()
  })

  it('redirects legacy note type detail routes to note templates', async () => {
    renderSettingsRoute('/settings/note-type-1')

    expect(
      await screen.findByRole('heading', {
        level: 3,
        name: 'Note templates page',
      })
    ).toBeTruthy()
  })
})
