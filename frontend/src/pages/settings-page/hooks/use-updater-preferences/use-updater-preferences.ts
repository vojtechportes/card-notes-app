import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { NoteStackUpdaterBridge } from '../../../../types/notestack-updater'
import { getNoteStackUpdater } from '../../../../utils/get-notestack-updater.util'

export const useUpdaterPreferences = () => {
  const { t } = useTranslation()
  const [updater] = useState<NoteStackUpdaterBridge | null>(getNoteStackUpdater)
  const [allowPrerelease, setAllowPrereleaseState] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(updater !== null)
  const [isSaving, setIsSaving] = useState(false)
  const isMountedRef = useRef(true)

  const setAllowPrerelease = useCallback(
    async (nextAllowPrerelease: boolean) => {
      if (!updater) {
        return
      }

      setError(null)
      setIsSaving(true)

      try {
        const preferences =
          await updater.setAllowPrerelease(nextAllowPrerelease)

        if (isMountedRef.current) {
          setAllowPrereleaseState(preferences.allowPrerelease)
        }
      } catch {
        if (isMountedRef.current) {
          setError(t('settings.updater.errors.preferenceSave'))
        }
      } finally {
        if (isMountedRef.current) {
          setIsSaving(false)
        }
      }
    },
    [t, updater]
  )

  useEffect(() => {
    isMountedRef.current = true

    if (!updater) {
      setIsLoading(false)

      return () => {
        isMountedRef.current = false
      }
    }

    void updater
      .getPreferences()
      .then((preferences) => {
        if (isMountedRef.current) {
          setAllowPrereleaseState(preferences.allowPrerelease)
        }
      })
      .catch(() => {
        if (isMountedRef.current) {
          setError(t('settings.updater.errors.preferenceLoad'))
        }
      })
      .finally(() => {
        if (isMountedRef.current) {
          setIsLoading(false)
        }
      })

    return () => {
      isMountedRef.current = false
    }
  }, [t, updater])

  return {
    allowPrerelease,
    error,
    isLoading,
    isSaving,
    isUpdaterAvailable: updater !== null,
    setAllowPrerelease,
  }
}
