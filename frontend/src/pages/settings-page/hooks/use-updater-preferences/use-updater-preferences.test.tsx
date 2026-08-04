import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../../../../i18n'
import type { NoteStackUpdaterBridge } from '../../../../types/notestack-updater'
import { useUpdaterPreferences } from './use-updater-preferences'

const createBridge = (): NoteStackUpdaterBridge => {
  return {
    checkForUpdates: vi.fn(),
    downloadUpdate: vi.fn(),
    getPreferences: vi.fn().mockResolvedValue({ allowPrerelease: true }),
    getState: vi.fn(),
    installUpdate: vi.fn(),
    setAllowPrerelease: vi.fn().mockResolvedValue({ allowPrerelease: false }),
    subscribe: vi.fn(() => vi.fn()),
  }
}

describe('useUpdaterPreferences', () => {
  beforeEach(() => {
    delete window.noteStackUpdater
  })

  afterEach(() => {
    cleanup()
    delete window.noteStackUpdater
  })

  it('loads and updates the persisted prerelease preference', async () => {
    const bridge = createBridge()

    window.noteStackUpdater = bridge

    const { result } = renderHook(() => useUpdaterPreferences())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.allowPrerelease).toBe(true)

    await act(async () => {
      await result.current.setAllowPrerelease(false)
    })

    expect(bridge.setAllowPrerelease).toHaveBeenCalledWith(false)
    expect(result.current.allowPrerelease).toBe(false)
  })

  it('surfaces a localized error when saving fails', async () => {
    const bridge = createBridge()

    vi.mocked(bridge.setAllowPrerelease).mockRejectedValueOnce(
      new Error('save failed')
    )
    window.noteStackUpdater = bridge

    const { result } = renderHook(() => useUpdaterPreferences())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.setAllowPrerelease(false)
    })

    expect(result.current.error).toBe(
      'The prerelease update preference could not be saved.'
    )
  })
})
