import { useCallback, useEffect, useState } from 'react'
import type { DeveloperToolsPreferences } from '../../../../types/developer-tools-preferences'
import { getDeveloperToolsBridge } from './utils/get-developer-tools-bridge.util'

interface DeveloperToolsPreferencesController {
  available: boolean
  enabled: boolean
  error: boolean
  loading: boolean
  openDeveloperTools: () => Promise<void>
  saving: boolean
  setEnabled: (enabled: boolean) => Promise<void>
}

export const useDeveloperToolsPreferences =
  (): DeveloperToolsPreferencesController => {
    const [preferences, setPreferences] =
      useState<DeveloperToolsPreferences | null>(null)
    const [error, setError] = useState(false)
    const [saving, setSaving] = useState(false)
    const available = Boolean(window.noteStackDeveloperTools)

    const setEnabled = useCallback(async (enabled: boolean) => {
      setError(false)
      setSaving(true)

      try {
        const nextPreferences =
          await getDeveloperToolsBridge().setEnabled(enabled)

        setPreferences(nextPreferences)
      } catch {
        setError(true)
      } finally {
        setSaving(false)
      }
    }, [])

    const openDeveloperTools = useCallback(async () => {
      setError(false)

      try {
        await getDeveloperToolsBridge().openDeveloperTools()
      } catch {
        setError(true)
      }
    }, [])

    useEffect(() => {
      if (!window.noteStackDeveloperTools) {
        return
      }

      let active = true

      void getDeveloperToolsBridge()
        .getPreferences()
        .then((nextPreferences) => {
          if (active) {
            setPreferences(nextPreferences)
          }
        })
        .catch(() => {
          if (active) {
            setError(true)
          }
        })

      return () => {
        active = false
      }
    }, [])

    return {
      available,
      enabled: preferences?.enabled ?? false,
      error,
      loading: available && preferences === null && !error,
      openDeveloperTools,
      saving,
      setEnabled,
    }
  }
