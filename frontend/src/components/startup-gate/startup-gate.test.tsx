import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NoteStackStartupBridge } from '../../types/notestack-startup-bridge'
import type { StartupState } from '../../types/startup-state'
import { App } from '../../app'
import '../../i18n'

const originalUserAgent = navigator.userAgent

interface BridgeHarness {
  bridge: NoteStackStartupBridge
  emit: (state: StartupState) => void
  unsubscribe: ReturnType<typeof vi.fn>
}

const createBridgeHarness = (
  currentState: Promise<StartupState>
): BridgeHarness => {
  let listener: ((state: StartupState) => void) | undefined
  const unsubscribe = vi.fn()

  return {
    bridge: {
      exit: vi.fn(async () => undefined),
      getState: vi.fn(() => currentState),
      openBackendLog: vi.fn(async () => 'opened' as const),
      retry: vi.fn(async () => undefined),
      subscribe: vi.fn((nextListener) => {
        listener = nextListener
        return unsubscribe
      }),
    },
    emit: (state) => listener?.(state),
    unsubscribe,
  }
}

describe('StartupGate', () => {
  afterEach(() => {
    cleanup()
    delete window.noteStackStartup
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: originalUserAgent,
    })
    window.location.hash = ''
  })

  it('falls back to ready in a standalone browser', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: /Notes/ })).toBeTruthy()
    expect(
      screen.queryByRole('progressbar', { name: 'Starting NoteStack' })
    ).toBeNull()
    expect(screen.getByRole('button', { name: 'Minimize' })).toBeTruthy()
  })

  it('blocks the app when an Electron preload fails to expose the bridge', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 NoteStack Electron/32.0.0',
    })

    render(<App />)

    expect(
      await screen.findByText(
        'NoteStack could not initialize its secure startup connection.'
      )
    ).toBeTruthy()
    expect(screen.queryByRole('heading', { name: /Notes/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull()
  })
  it('shows centered accessible progress and keeps the app layout unmounted', () => {
    const harness = createBridgeHarness(new Promise(() => undefined))
    window.noteStackStartup = harness.bridge

    render(<App />)

    expect(screen.queryByRole('img', { name: 'NoteStack logo' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'NoteStack' })).toBeNull()
    expect(
      screen.getByRole('heading', { name: 'NoteStack is starting' })
    ).toBeTruthy()
    expect(screen.getByText('Please wait a moment.')).toBeTruthy()
    expect(screen.queryByText(/local data service/i)).toBeNull()
    expect(
      screen.getByRole('progressbar', { name: 'Starting NoteStack' })
    ).toBeTruthy()
    expect(screen.queryByRole('heading', { name: /Notes/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Minimize' })).toBeTruthy()
  })

  it('offers recovery actions while startup keeps polling', async () => {
    const harness = createBridgeHarness(
      Promise.resolve({ status: 'starting', phase: 'taking-longer' })
    )
    window.noteStackStartup = harness.bridge

    render(<App />)

    expect(
      await screen.findByRole('heading', {
        name: 'Startup is taking longer than usual',
      })
    ).toBeTruthy()
    expect(
      screen.getByRole('progressbar', { name: 'Starting NoteStack' })
    ).toBeTruthy()

    expect(
      screen.getByText('You can keep waiting, try again, or exit NoteStack.')
    ).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: 'Open backend log' })
    ).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    fireEvent.click(screen.getByRole('button', { name: 'Exit' }))

    expect(harness.bridge.retry).toHaveBeenCalledOnce()
    expect(harness.bridge.openBackendLog).not.toHaveBeenCalled()
    expect(harness.bridge.exit).toHaveBeenCalledOnce()
  })

  it.each([
    ['entrypoint-missing', 'The local data service could not be found.'],
    ['spawn-error', 'The local data service could not be launched.'],
    ['process-exited', 'The local data service stopped before it was ready.'],
    [
      'termination-failed',
      'The previous local data service could not be stopped safely.',
    ],
  ] as const)('shows localized %s failure copy', async (reason, message) => {
    const harness = createBridgeHarness(
      Promise.resolve({ status: 'failed', reason })
    )
    window.noteStackStartup = harness.bridge

    render(<App />)

    expect(
      await screen.findByRole('heading', {
        name: 'NoteStack could not start',
      })
    ).toBeTruthy()
    expect(screen.getByText(message)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
    expect(screen.queryByRole('progressbar')).toBeNull()
  })

  it('subscribes before current-state retrieval and ignores a stale retrieval result', async () => {
    let resolveCurrentState: ((state: StartupState) => void) | undefined
    const currentState = new Promise<StartupState>((resolve) => {
      resolveCurrentState = resolve
    })
    const harness = createBridgeHarness(currentState)
    window.noteStackStartup = harness.bridge

    render(<App />)

    act(() => {
      harness.emit({ status: 'ready' })
    })

    expect(await screen.findByRole('heading', { name: /Notes/ })).toBeTruthy()

    await act(async () => {
      resolveCurrentState?.({ status: 'starting', phase: 'initial' })
      await currentState
    })

    expect(screen.getByRole('heading', { name: /Notes/ })).toBeTruthy()
    expect(
      screen.queryByRole('heading', { name: 'NoteStack is starting' })
    ).toBeNull()
  })

  it('unsubscribes from startup state when unmounted', async () => {
    const harness = createBridgeHarness(
      Promise.resolve({ status: 'starting', phase: 'initial' })
    )
    window.noteStackStartup = harness.bridge

    const view = render(<App />)

    await waitFor(() => expect(harness.bridge.getState).toHaveBeenCalledOnce())
    view.unmount()

    expect(harness.unsubscribe).toHaveBeenCalledOnce()
  })
})
