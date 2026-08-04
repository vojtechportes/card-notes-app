import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../../../../../i18n'
import { AppProviders } from '../../../../../components/app-providers/app-providers'
import { useUpdaterPreferences } from '../../../hooks/use-updater-preferences/use-updater-preferences'
import { PrereleaseUpdatesControl } from './prerelease-updates-control'

vi.mock(
  '../../../hooks/use-updater-preferences/use-updater-preferences',
  () => ({
    useUpdaterPreferences: vi.fn(),
  })
)

const useUpdaterPreferencesMock = vi.mocked(useUpdaterPreferences)

const renderControl = (kind: 'checking' | 'idle' = 'idle') => {
  return render(
    <AppProviders>
      <PrereleaseUpdatesControl
        updaterState={{ currentVersion: '1.13.1', kind }}
      />
    </AppProviders>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  useUpdaterPreferencesMock.mockReturnValue({
    allowPrerelease: false,
    error: null,
    isLoading: false,
    isSaving: false,
    isUpdaterAvailable: true,
    setAllowPrerelease: vi.fn(),
  })
})

afterEach(() => {
  cleanup()
})

describe('PrereleaseUpdatesControl', () => {
  it('renders localized guidance and saves checkbox changes', async () => {
    const setAllowPrerelease = vi.fn().mockResolvedValue(undefined)

    useUpdaterPreferencesMock.mockReturnValue({
      allowPrerelease: false,
      error: null,
      isLoading: false,
      isSaving: false,
      isUpdaterAvailable: true,
      setAllowPrerelease,
    })

    renderControl()

    expect(
      screen.getByText(
        'Prerelease builds may be less stable. Changing this setting checks for updates again.'
      )
    ).toBeTruthy()

    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Receive prerelease updates' })
    )

    await waitFor(() => {
      expect(setAllowPrerelease).toHaveBeenCalledWith(true)
    })
  })

  it('reflects the persisted preference and disables changes during checks', () => {
    useUpdaterPreferencesMock.mockReturnValue({
      allowPrerelease: true,
      error: null,
      isLoading: false,
      isSaving: false,
      isUpdaterAvailable: true,
      setAllowPrerelease: vi.fn(),
    })

    renderControl('checking')

    const checkbox = screen.getByRole('checkbox', {
      name: 'Receive prerelease updates',
    }) as HTMLInputElement

    expect(checkbox.checked).toBe(true)
    expect(checkbox.disabled).toBe(true)
  })

  it('renders preference persistence errors', () => {
    useUpdaterPreferencesMock.mockReturnValue({
      allowPrerelease: false,
      error: 'The prerelease update preference could not be saved.',
      isLoading: false,
      isSaving: false,
      isUpdaterAvailable: true,
      setAllowPrerelease: vi.fn(),
    })

    renderControl()

    expect(
      screen.getByText('The prerelease update preference could not be saved.')
    ).toBeTruthy()
  })
})
