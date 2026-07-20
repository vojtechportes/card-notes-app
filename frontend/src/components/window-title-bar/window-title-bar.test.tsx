import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { theme } from '../../theme'
import type {
  NoteStackWindowControlsBridge,
  WindowControlsState,
} from './types/notestack-window-controls-bridge'
import { WindowTitleBar } from './window-title-bar'
import '../../i18n'

interface WindowControlsHarness {
  bridge: NoteStackWindowControlsBridge
  emit: (state: WindowControlsState) => void
  unsubscribe: ReturnType<typeof vi.fn>
}

const createWindowControlsHarness = (
  initialState: WindowControlsState
): WindowControlsHarness => {
  let listener: ((state: WindowControlsState) => void) | undefined
  const unsubscribe = vi.fn()

  return {
    bridge: {
      close: vi.fn(async () => undefined),
      getState: vi.fn(async () => initialState),
      minimize: vi.fn(async () => undefined),
      subscribe: vi.fn((nextListener) => {
        listener = nextListener
        return unsubscribe
      }),
      toggleMaximize: vi.fn(async () => undefined),
    },
    emit: (state) => listener?.(state),
    unsubscribe,
  }
}

const renderTitleBar = () => {
  return render(
    <ThemeProvider theme={theme}>
      <WindowTitleBar />
    </ThemeProvider>
  )
}

describe('WindowTitleBar', () => {
  afterEach(() => {
    cleanup()
    delete window.noteStackWindowControls
  })

  it('renders only the three localized window controls', () => {
    renderTitleBar()

    expect(screen.queryByText('NoteStack')).toBeNull()
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByRole('button', { name: 'Minimize' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Maximize' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy()
  })

  it('invokes window actions and synchronizes maximize state', async () => {
    const harness = createWindowControlsHarness({ isMaximized: true })
    window.noteStackWindowControls = harness.bridge

    const view = renderTitleBar()

    expect(await screen.findByRole('button', { name: 'Restore' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Minimize' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(harness.bridge.minimize).toHaveBeenCalledOnce()
    expect(harness.bridge.toggleMaximize).toHaveBeenCalledOnce()
    expect(harness.bridge.close).toHaveBeenCalledOnce()

    harness.emit({ isMaximized: false })

    expect(await screen.findByRole('button', { name: 'Maximize' })).toBeTruthy()

    view.unmount()
    await waitFor(() => expect(harness.unsubscribe).toHaveBeenCalledOnce())
  })
})
