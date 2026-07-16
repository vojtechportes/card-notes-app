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
    window.location.hash = ''
  })

  it('falls back to ready in a standalone browser', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: /Notes/ })).toBeTruthy()
    expect(
      screen.queryByRole('progressbar', { name: 'Starting NoteStack' })
    ).toBeNull()
  })

  it('shows branded accessible progress and keeps the app layout unmounted', () => {
    const harness = createBridgeHarness(new Promise(() => undefined))
    window.noteStackStartup = harness.bridge

    render(<App />)

    expect(screen.getByRole('img', { name: 'NoteStack logo' })).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'Getting your notes ready' })
    ).toBeTruthy()
    expect(
      screen.getByRole('progressbar', { name: 'Starting NoteStack' })
    ).toBeTruthy()
    expect(screen.queryByRole('heading', { name: /Notes/ })).toBeNull()
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

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open backend log' }))
    fireEvent.click(screen.getByRole('button', { name: 'Exit' }))

    expect(harness.bridge.retry).toHaveBeenCalledOnce()
    expect(harness.bridge.openBackendLog).toHaveBeenCalledOnce()
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
      screen.queryByRole('heading', { name: 'Getting your notes ready' })
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
