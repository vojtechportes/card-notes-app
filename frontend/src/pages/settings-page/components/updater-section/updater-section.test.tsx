import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../../../../i18n'
import { AppProviders } from '../../../../components/app-providers/app-providers'
import { useUpdaterState } from '../../hooks/use-updater-state/use-updater-state'
import { UpdaterSection } from './updater-section'

vi.mock('../../hooks/use-updater-state/use-updater-state', () => ({
  useUpdaterState: vi.fn(),
}))

const useUpdaterStateMock = vi.mocked(useUpdaterState)

const renderUpdaterSection = () => {
  return render(
    <AppProviders>
      <UpdaterSection />
    </AppProviders>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  useUpdaterStateMock.mockReturnValue({
    checkForUpdates: vi.fn(),
    downloadUpdate: vi.fn(),
    installUpdate: vi.fn(),
    isLoading: false,
    isUpdaterAvailable: true,
    state: {
      currentVersion: '1.0.3',
      kind: 'idle',
    },
  })
})

afterEach(() => {
  cleanup()
})

describe('UpdaterSection', () => {
  it('renders the current app version and lets the user check for updates', async () => {
    const checkForUpdates = vi.fn().mockResolvedValue(undefined)

    useUpdaterStateMock.mockReturnValue({
      checkForUpdates,
      downloadUpdate: vi.fn(),
      installUpdate: vi.fn(),
      isLoading: false,
      isUpdaterAvailable: true,
      state: {
        currentVersion: '1.0.3',
        kind: 'idle',
      },
    })

    renderUpdaterSection()

    expect(screen.getByText('Current version')).toBeTruthy()
    expect(screen.getByText('1.0.3')).toBeTruthy()
    expect(
      screen.getByText('You can check for updates whenever you are ready.')
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Check for updates' }))

    await waitFor(() => {
      expect(checkForUpdates).toHaveBeenCalledTimes(1)
    })
  })

  it('shows download details and triggers the download action for available updates', async () => {
    const downloadUpdate = vi.fn().mockResolvedValue(undefined)

    useUpdaterStateMock.mockReturnValue({
      checkForUpdates: vi.fn(),
      downloadUpdate,
      installUpdate: vi.fn(),
      isLoading: false,
      isUpdaterAvailable: true,
      state: {
        currentVersion: '1.0.3',
        kind: 'available',
        update: {
          releaseDate: '2026-07-10T10:00:00.000Z',
          releaseName: 'Stable',
          version: '1.0.4',
        },
      },
    })

    renderUpdaterSection()

    expect(screen.getByText('Latest version')).toBeTruthy()
    expect(screen.getByText('1.0.4')).toBeTruthy()
    expect(screen.getByText('Release date')).toBeTruthy()
    expect(screen.getByText(/2026-07-10/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Download update' }))

    await waitFor(() => {
      expect(downloadUpdate).toHaveBeenCalledTimes(1)
    })
  })

  it('shows download progress and disables the CTA while downloading', () => {
    useUpdaterStateMock.mockReturnValue({
      checkForUpdates: vi.fn(),
      downloadUpdate: vi.fn(),
      installUpdate: vi.fn(),
      isLoading: false,
      isUpdaterAvailable: true,
      state: {
        currentVersion: '1.0.3',
        kind: 'downloading',
        progress: {
          bytesPerSecond: 1024,
          percent: 62.6,
          total: 2000,
          transferred: 1252,
        },
        update: {
          releaseDate: '2026-07-10T10:00:00.000Z',
          releaseName: 'Stable',
          version: '1.0.4',
        },
      },
    })

    renderUpdaterSection()

    expect(screen.getByText('Downloading version 1.0.4 (63%).')).toBeTruthy()
    expect(
      (
        screen.getByRole('button', {
          name: 'Downloading update...',
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true)
  })

  it('lets the user install and restart once the update is downloaded', async () => {
    const installUpdate = vi.fn().mockResolvedValue(undefined)

    useUpdaterStateMock.mockReturnValue({
      checkForUpdates: vi.fn(),
      downloadUpdate: vi.fn(),
      installUpdate,
      isLoading: false,
      isUpdaterAvailable: true,
      state: {
        currentVersion: '1.0.3',
        kind: 'downloaded',
        update: {
          releaseDate: '2026-07-10T10:00:00.000Z',
          releaseName: 'Stable',
          version: '1.0.4',
        },
      },
    })

    renderUpdaterSection()

    expect(screen.getByText('Version 1.0.4 is ready to install.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Install and restart' }))

    await waitFor(() => {
      expect(installUpdate).toHaveBeenCalledTimes(1)
    })
  })

  it('surfaces updater errors and falls back to manual checks', async () => {
    const checkForUpdates = vi.fn().mockResolvedValue(undefined)

    useUpdaterStateMock.mockReturnValue({
      checkForUpdates,
      downloadUpdate: vi.fn(),
      installUpdate: vi.fn(),
      isLoading: false,
      isUpdaterAvailable: true,
      state: {
        currentVersion: '1.0.3',
        kind: 'error',
        message: 'Network unavailable.',
        update: null,
      },
    })

    renderUpdaterSection()

    expect(screen.getByText('Network unavailable.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Check for updates' }))

    await waitFor(() => {
      expect(checkForUpdates).toHaveBeenCalledTimes(1)
    })
  })

  it('shows a disabled state when the updater bridge is unavailable', () => {
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

    renderUpdaterSection()

    expect(
      screen.getByText('Automatic updates are unavailable in this environment.')
    ).toBeTruthy()
    expect(
      (
        screen.getByRole('button', {
          name: 'Updater unavailable',
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true)
  })
})
