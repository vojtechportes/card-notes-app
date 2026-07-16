import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../../../../i18n'
import { UpdatesSettingsPage } from './updates-settings-page'

vi.mock('../updater-section/updater-section', () => ({
  UpdaterSection: () => <section aria-label="Updates section" />,
}))

afterEach(() => {
  cleanup()
})

describe('UpdatesSettingsPage', () => {
  it('renders localized page copy and the updater section', () => {
    render(<UpdatesSettingsPage />)

    expect(
      screen.getByRole('heading', { level: 2, name: 'Updates' })
    ).toBeTruthy()
    expect(
      screen.getByText(
        'Check for NoteStack updates, download new versions, and install them when they are ready.'
      )
    ).toBeTruthy()
    expect(screen.getByLabelText('Updates section')).toBeTruthy()
  })
})
