import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../../../../i18n'
import { NoteTemplatesSettingsPage } from './note-templates-settings-page'

vi.mock('../note-types-section/note-types-section', () => ({
  NoteTypesSection: () => (
    <section aria-label="Note template management">
      Nested template fields
    </section>
  ),
}))

describe('NoteTemplatesSettingsPage', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the localized page title and description', () => {
    render(<NoteTemplatesSettingsPage />)

    expect(
      screen.getByRole('heading', { level: 2, name: 'Note templates' })
    ).toBeTruthy()
    expect(
      screen.getByText(
        'Create and organize note templates, then open a template to manage its nested fields and field settings.'
      )
    ).toBeTruthy()
  })

  it('keeps note template and nested field management on the page', () => {
    render(<NoteTemplatesSettingsPage />)

    expect(
      screen.getByRole('region', { name: 'Note template management' })
    ).toBeTruthy()
    expect(screen.getByText('Nested template fields')).toBeTruthy()
  })
})
