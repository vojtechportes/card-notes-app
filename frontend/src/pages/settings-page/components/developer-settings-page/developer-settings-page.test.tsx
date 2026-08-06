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
import type { NoteStackOAuthBridge } from '../../../../types/notestack-oauth-bridge'
import { OAuthProviderEnum } from '../../../../types/oauth-provider-enum'
import type { OAuthPublicState } from '../../../../types/oauth-public-state'
import { DeveloperSettingsPage } from './developer-settings-page'

const createOAuthBridge = (
  initialState: OAuthPublicState
): NoteStackOAuthBridge & {
  emit: (state: OAuthPublicState) => void
} => {
  let listener: ((state: OAuthPublicState) => void) | null = null

  return {
    cancel: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    emit: (state) => listener?.(state),
    getState: vi.fn().mockResolvedValue(initialState),
    reconnect: vi.fn(),
    subscribe: vi.fn().mockImplementation((nextListener) => {
      listener = nextListener

      return () => {
        listener = null
      }
    }),
  }
}

const createBridge = (
  enabled = false
): NoteStackDeveloperToolsBridge & {
  getPreferences: ReturnType<typeof vi.fn>
  openBackendLog: ReturnType<typeof vi.fn>
  openDeveloperTools: ReturnType<typeof vi.fn>
  setEnabled: ReturnType<typeof vi.fn>
} => ({
  getPreferences: vi.fn().mockResolvedValue({ enabled }),
  openBackendLog: vi.fn().mockResolvedValue('opened'),
  openDeveloperTools: vi.fn().mockResolvedValue(undefined),
  setEnabled: vi.fn().mockImplementation(async (nextEnabled: boolean) => ({
    enabled: nextEnabled,
  })),
})

describe('DeveloperSettingsPage', () => {
  afterEach(() => {
    cleanup()
    delete window.noteStackDeveloperTools
    delete window.noteStackOAuth
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
    expect(
      screen.queryByRole('button', { name: 'Open raw backend log' })
    ).toBeNull()

    fireEvent.click(toggle)

    await waitFor(() => expect(bridge.setEnabled).toHaveBeenCalledWith(true))
    expect(
      await screen.findByRole('button', { name: 'Open Developer Tools' })
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Open raw backend log' })
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

  it('opens the raw backend log through the enabled developer bridge', async () => {
    const bridge = createBridge(true)
    window.noteStackDeveloperTools = bridge

    render(<DeveloperSettingsPage />)

    fireEvent.click(
      await screen.findByRole('button', { name: 'Open raw backend log' })
    )

    await waitFor(() => expect(bridge.openBackendLog).toHaveBeenCalledTimes(1))
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

  it('shows the last sanitized OAuth diagnostic without sensitive provider data', async () => {
    window.noteStackDeveloperTools = createBridge()
    window.noteStackOAuth = createOAuthBridge({
      account: null,
      diagnosticCode: 'oauth-authorization-code-exchange-invalid-grant',
      errorCode: 'oauth-reconnect-required',
      provider: OAuthProviderEnum.GoogleDrive,
      status: 'reconnect-required',
    })

    render(<DeveloperSettingsPage />)

    expect(await screen.findByText('Provider: Google Drive')).toBeTruthy()
    expect(screen.getByText('oauth-reconnect-required')).toBeTruthy()
    expect(
      screen.getByText('oauth-authorization-code-exchange-invalid-grant')
    ).toBeTruthy()
    expect(screen.queryByText(/provider description/i)).toBeNull()
  })

  it('updates OAuth diagnostics from the existing bridge subscription', async () => {
    const oauthBridge = createOAuthBridge({
      account: null,
      diagnosticCode: null,
      errorCode: null,
      provider: null,
      status: 'disconnected',
    })
    window.noteStackDeveloperTools = createBridge()
    window.noteStackOAuth = oauthBridge

    render(<DeveloperSettingsPage />)

    expect(await screen.findByText('Provider: None recorded')).toBeTruthy()

    oauthBridge.emit({
      account: null,
      diagnosticCode: 'oauth-refresh-token-exchange-invalid-client',
      errorCode: 'oauth-reconnect-required',
      provider: OAuthProviderEnum.OneDrive,
      status: 'reconnect-required',
    })

    expect(
      await screen.findByText('oauth-refresh-token-exchange-invalid-client')
    ).toBeTruthy()
    expect(screen.getByText('Provider: Microsoft OneDrive')).toBeTruthy()
  })
})
