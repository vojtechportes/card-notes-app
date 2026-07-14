import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../../../../i18n'
import { GeneralSettingsPage } from './general-settings-page'

vi.mock('../general-section/general-section', () => ({
  GeneralSection: () => <section aria-label="Display preferences form" />,
}))

vi.mock('../updater-section/updater-section', () => ({
  UpdaterSection: () => <section aria-label="Updates section" />,
}))

afterEach(() => {
  cleanup()
})

describe('GeneralSettingsPage', () => {
  it('renders a localized general page title and display preferences description', () => {
    render(<GeneralSettingsPage />)

    expect(
      screen.getByRole('heading', { level: 2, name: 'General' })
    ).toBeTruthy()
    expect(
      screen.getByText(
        'Set app-wide display preferences for note cards, including text truncation and how many fields appear before opening a note.'
      )
    ).toBeTruthy()
  })

  it('keeps display preferences and updater content on the general page', () => {
    render(<GeneralSettingsPage />)

    expect(screen.getByLabelText('Display preferences form')).toBeTruthy()
    expect(screen.getByLabelText('Updates section')).toBeTruthy()
  })
})
