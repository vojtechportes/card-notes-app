import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../../../../i18n'
import { DataManagementSettingsPage } from './data-management-settings-page'

vi.mock('../danger-zone-section/danger-zone-section', () => ({
  DangerZoneSection: () => <section aria-label="Danger Zone" />,
}))

describe('DataManagementSettingsPage', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the localized page title and description', () => {
    render(<DataManagementSettingsPage />)

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
    render(<DataManagementSettingsPage />)

    expect(screen.getByRole('region', { name: 'Danger Zone' })).toBeTruthy()
  })
})
