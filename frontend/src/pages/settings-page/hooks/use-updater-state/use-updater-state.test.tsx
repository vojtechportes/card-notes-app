import {
  act,
  cleanup,
  renderHook,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import '../../../../i18n'
import type {
  NoteStackUpdaterBridge,
  UpdaterActionResult,
  UpdaterState,
} from '../../../../types/notestack-updater'
import { useUpdaterState } from './use-updater-state'

interface MockUpdaterBridge extends NoteStackUpdaterBridge {
  emit: (state: UpdaterState) => void
  unsubscribe: ReturnType<typeof vi.fn>
}

const createActionResult = (state: UpdaterState): UpdaterActionResult => {
  return {
    accepted: true,
    reason: null,
    state,
  }
}

const createBridge = (initialState: UpdaterState): MockUpdaterBridge => {
  let listener: ((state: UpdaterState) => void) | null = null
  const unsubscribe = vi.fn()

  return {
    checkForUpdates: vi.fn().mockResolvedValue(
      createActionResult({
        currentVersion: initialState.currentVersion,
        kind: 'checking',
      })
    ),
    downloadUpdate: vi.fn().mockResolvedValue(
      createActionResult({
        currentVersion: initialState.currentVersion,
        kind: 'downloading',
        progress: {
          bytesPerSecond: 1024,
          percent: 10,
          total: 100,
          transferred: 10,
        },
        update: {
          releaseDate: null,
          releaseName: null,
          version: '1.0.4',
        },
      })
    ),
    emit: (state) => {
      listener?.(state)
    },
    getState: vi.fn().mockResolvedValue(initialState),
    installUpdate: vi.fn().mockResolvedValue(
      createActionResult({
        currentVersion: initialState.currentVersion,
        kind: 'installing',
        update: {
          releaseDate: null,
          releaseName: null,
          version: '1.0.4',
        },
      })
    ),
    subscribe: vi.fn((nextListener) => {
      listener = nextListener

      return () => {
        listener = null
        unsubscribe()
      }
    }),
    unsubscribe,
  }
}

describe('useUpdaterState', () => {
  beforeEach(() => {
    delete window.noteStackUpdater
  })

  afterEach(() => {
    cleanup()
    delete window.noteStackUpdater
  })

  it('falls back to an unavailable state when the updater bridge is missing', () => {
    const { result } = renderHook(() => useUpdaterState())

    expect(result.current.isLoading).toBe(false)
    expect(result.current.isUpdaterAvailable).toBe(false)
    expect(result.current.state).toEqual({
      currentVersion: 'Unavailable',
      kind: 'unavailable',
      reason: 'updater-disabled',
    })
  })

  it('surfaces a localized error when the initial updater state cannot be loaded', async () => {
    const bridge = createBridge({
      currentVersion: '1.0.3',
      kind: 'idle',
    })

    ;(bridge.getState as Mock).mockRejectedValueOnce(new Error('load failed'))
    window.noteStackUpdater = bridge

    const { result } = renderHook(() => useUpdaterState())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.state).toEqual({
      currentVersion: 'Unavailable',
      kind: 'error',
      message: 'Updater status could not be loaded right now.',
      update: null,
    })
  })

  it('loads the initial updater state, reacts to subscriptions, and unsubscribes on unmount', async () => {
    const bridge = createBridge({
      currentVersion: '1.0.3',
      kind: 'idle',
    })

    window.noteStackUpdater = bridge

    const { result, unmount } = renderHook(() => useUpdaterState())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.state).toEqual({
      currentVersion: '1.0.3',
      kind: 'idle',
    })

    act(() => {
      bridge.emit({
        currentVersion: '1.0.3',
        kind: 'available',
        update: {
          releaseDate: null,
          releaseName: null,
          version: '1.0.4',
        },
      })
    })

    expect(result.current.state).toEqual({
      currentVersion: '1.0.3',
      kind: 'available',
      update: {
        releaseDate: null,
        releaseName: null,
        version: '1.0.4',
      },
    })

    unmount()

    expect(bridge.unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('updates local state from updater actions', async () => {
    const bridge = createBridge({
      currentVersion: '1.0.3',
      kind: 'idle',
    })

    window.noteStackUpdater = bridge

    const { result } = renderHook(() => useUpdaterState())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.checkForUpdates()
    })

    expect(bridge.checkForUpdates).toHaveBeenCalledTimes(1)
    expect(result.current.state).toEqual({
      currentVersion: '1.0.3',
      kind: 'checking',
    })

    act(() => {
      bridge.emit({
        currentVersion: '1.0.3',
        kind: 'downloaded',
        update: {
          releaseDate: null,
          releaseName: null,
          version: '1.0.4',
        },
      })
    })

    await act(async () => {
      await result.current.installUpdate()
    })

    expect(bridge.installUpdate).toHaveBeenCalledTimes(1)
    expect(result.current.state).toEqual({
      currentVersion: '1.0.3',
      kind: 'installing',
      update: {
        releaseDate: null,
        releaseName: null,
        version: '1.0.4',
      },
    })
  })

  it('surfaces a localized error when an updater action rejects', async () => {
    const bridge = createBridge({
      currentVersion: '1.0.3',
      kind: 'idle',
    })

    ;(bridge.checkForUpdates as Mock).mockRejectedValueOnce(
      new Error('action failed')
    )
    window.noteStackUpdater = bridge

    const { result } = renderHook(() => useUpdaterState())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.checkForUpdates()
    })

    expect(result.current.state).toEqual({
      currentVersion: '1.0.3',
      kind: 'error',
      message: 'The updater action could not be completed.',
      update: null,
    })
  })
})
