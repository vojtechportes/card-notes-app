import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  CardNotesUpdaterBridge,
  UpdaterState,
} from '../../../../types/card-notes-updater'
import { getCardNotesUpdater } from '../../../../utils/get-card-notes-updater.util'
import { createFallbackUpdaterState } from './utils/create-fallback-updater-state.util'
import { createUnexpectedUpdaterErrorState } from './utils/create-unexpected-updater-error-state.util'
import { runUpdaterAction } from './utils/run-updater-action.util'

export const useUpdaterState = () => {
  const { t } = useTranslation()
  const [updater] = useState<CardNotesUpdaterBridge | null>(getCardNotesUpdater)
  const [state, setState] = useState<UpdaterState>(createFallbackUpdaterState)
  const [isLoading, setIsLoading] = useState(updater !== null)

  const actionErrorMessage = t('settings.updater.errors.action')
  const loadErrorMessage = t('settings.updater.errors.load')

  const checkForUpdates = useCallback(async () => {
    if (!updater) {
      return
    }

    await runUpdaterAction(
      updater,
      'checkForUpdates',
      setState,
      state,
      actionErrorMessage
    )
  }, [actionErrorMessage, state, updater])

  const downloadUpdate = useCallback(async () => {
    if (!updater) {
      return
    }

    await runUpdaterAction(
      updater,
      'downloadUpdate',
      setState,
      state,
      actionErrorMessage
    )
  }, [actionErrorMessage, state, updater])

  const installUpdate = useCallback(async () => {
    if (!updater) {
      return
    }

    await runUpdaterAction(
      updater,
      'installUpdate',
      setState,
      state,
      actionErrorMessage
    )
  }, [actionErrorMessage, state, updater])

  useEffect(() => {
    if (!updater) {
      setIsLoading(false)
      return
    }

    let isSubscribed = true

    void updater
      .getState()
      .then((nextState) => {
        if (isSubscribed) {
          setState(nextState)
        }
      })
      .catch(() => {
        if (isSubscribed) {
          setState((currentState) =>
            createUnexpectedUpdaterErrorState(currentState, loadErrorMessage)
          )
        }
      })
      .finally(() => {
        if (isSubscribed) {
          setIsLoading(false)
        }
      })

    const unsubscribe = updater.subscribe((nextState) => {
      setState(nextState)
    })

    return () => {
      isSubscribed = false
      unsubscribe()
    }
  }, [loadErrorMessage, updater])

  return {
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    isLoading,
    isUpdaterAvailable: updater !== null,
    state,
  }
}
