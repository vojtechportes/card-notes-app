import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../../../../i18n'
import type { NoteStackDeveloperToolsBridge } from '../../../../types/notestack-developer-tools-bridge'
import { DeveloperSettingsPage } from './developer-settings-page'

const createBridge = (
  enabled = false
): NoteStackDeveloperToolsBridge & {
  getPreferences: ReturnType<typeof vi.fn>
  openDeveloperTools: ReturnType<typeof vi.fn>
  setEnabled: ReturnType<typeof vi.fn>
} => ({
  getPreferences: vi.fn().mockResolvedValue({ enabled }),
  openDeveloperTools: vi.fn().mockResolvedValue(undefined),
  setEnabled: vi.fn().mockImplementation(async (nextEnabled: boolean) => ({
    enabled: nextEnabled,
  })),
})

describe('DeveloperSettingsPage', () => {
  afterEach(() => {
    cleanup()
    delete window.noteStackDeveloperTools
  })

  it('shows a desktop-only message when the Electron bridge is unavailable', () => {
    render(<DeveloperSettingsPage />)

    expect(
      screen.getByText(
        'Developer options are available only in the NoteStack desktop app.'
      )
    ).toBeTruthy()
    expect(
      screen.queryByRole('switch', { name: 'Enable developer options' })
    ).toBeNull()
  })

  it('keeps the developer action hidden until the persisted opt-in is enabled', async () => {
    const bridge = createBridge()
    window.noteStackDeveloperTools = bridge

    render(<DeveloperSettingsPage />)

    const toggle = await screen.findByRole('switch', {
      name: 'Enable developer options',
    })

    expect((toggle as HTMLInputElement).checked).toBe(false)
    expect(
      screen.queryByRole('button', { name: 'Open Developer Tools' })
    ).toBeNull()

    fireEvent.click(toggle)

    await waitFor(() => expect(bridge.setEnabled).toHaveBeenCalledWith(true))
    expect(
      await screen.findByRole('button', { name: 'Open Developer Tools' })
    ).toBeTruthy()
  })

  it('loads an enabled preference and opens Developer Tools through the bridge', async () => {
    const bridge = createBridge(true)
    window.noteStackDeveloperTools = bridge

    render(<DeveloperSettingsPage />)

    fireEvent.click(
      await screen.findByRole('button', { name: 'Open Developer Tools' })
    )

    await waitFor(() =>
      expect(bridge.openDeveloperTools).toHaveBeenCalledTimes(1)
    )
  })

  it('shows a localized error when a developer action fails', async () => {
    const bridge = createBridge(true)
    bridge.openDeveloperTools.mockRejectedValue(new Error('failed'))
    window.noteStackDeveloperTools = bridge

    render(<DeveloperSettingsPage />)

    fireEvent.click(
      await screen.findByRole('button', { name: 'Open Developer Tools' })
    )

    expect(
      await screen.findByText(
        'The developer action could not be completed. Try again.'
      )
    ).toBeTruthy()
  })
})
