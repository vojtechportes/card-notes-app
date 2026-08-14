import { useCallback, useEffect, useMemo, useState } from 'react'
import type { LabelMatchMode } from '../types/label-match-mode'
import type { NotesDataGridColumnWidths } from '../types/notes-data-grid-column-widths'
import type { NotesViewMode } from '../types/notes-view-mode'
import type { UseNotesViewPreferencesOptions } from '../types/use-notes-view-preferences-options'
import { areNotesViewPreferencesEqual } from '../utils/are-notes-view-preferences-equal.util'
import { getDataGridLabelOptions } from '../utils/get-data-grid-label-options.util'
import { intersectPreferenceIds } from '../utils/intersect-preference-ids.util'
import { readNotesViewPreferences } from '../utils/read-notes-view-preferences.util'
import { reconcileNotesDataGridColumnWidths } from '../utils/reconcile-notes-data-grid-column-widths.util'
import { reconcileNotesViewFilters } from '../utils/reconcile-notes-view-filters.util'
import { writeNotesViewPreferences } from '../utils/write-notes-view-preferences.util'

export const useNotesViewPreferences = ({
  areColumnsReady,
  areLabelsReady,
  areNoteTypesReady,
  columnsByNoteTypeId,
  labels,
  noteTypes,
  storage,
}: UseNotesViewPreferencesOptions) => {
  const [preferences, setPreferences] = useState(() =>
    readNotesViewPreferences(storage)
  )
  const reconciledFilterPreferences = useMemo(() => {
    if (!areNoteTypesReady || !areLabelsReady) {
      return null
    }

    return reconcileNotesViewFilters(preferences, noteTypes, labels)
  }, [areLabelsReady, areNoteTypesReady, labels, noteTypes, preferences])
  const dataGridLabelOptions = useMemo(
    () => getDataGridLabelOptions(labels, preferences.dataGrid.noteTypeId),
    [labels, preferences.dataGrid.noteTypeId]
  )
  const reconciledColumnWidths = useMemo(() => {
    if (!areNoteTypesReady || !areColumnsReady) {
      return null
    }

    return reconcileNotesDataGridColumnWidths(
      preferences.dataGridColumnWidths,
      noteTypes,
      columnsByNoteTypeId
    )
  }, [
    areColumnsReady,
    areNoteTypesReady,
    columnsByNoteTypeId,
    noteTypes,
    preferences.dataGridColumnWidths,
  ])
  const areFiltersReconciled = Boolean(
    reconciledFilterPreferences &&
    areNotesViewPreferencesEqual(preferences, reconciledFilterPreferences)
  )
  const areColumnWidthsReconciled = useMemo(() => {
    if (!reconciledColumnWidths) {
      return true
    }

    return (
      JSON.stringify(preferences.dataGridColumnWidths) ===
      JSON.stringify(reconciledColumnWidths)
    )
  }, [preferences.dataGridColumnWidths, reconciledColumnWidths])

  const setViewMode = useCallback((viewMode: NotesViewMode) => {
    setPreferences((currentPreferences) => ({
      ...currentPreferences,
      viewMode,
    }))
  }, [])

  const setCardNoteTypeIds = useCallback((noteTypeIds: string[]) => {
    setPreferences((currentPreferences) => ({
      ...currentPreferences,
      card: {
        ...currentPreferences.card,
        noteTypeIds: [...new Set(noteTypeIds)],
      },
    }))
  }, [])

  const setCardLabelIds = useCallback((labelIds: string[]) => {
    setPreferences((currentPreferences) => ({
      ...currentPreferences,
      card: {
        ...currentPreferences.card,
        labelIds: [...new Set(labelIds)],
      },
    }))
  }, [])

  const setCardLabelMatchMode = useCallback(
    (labelMatchMode: LabelMatchMode) => {
      setPreferences((currentPreferences) => ({
        ...currentPreferences,
        card: {
          ...currentPreferences.card,
          labelMatchMode,
        },
      }))
    },
    []
  )

  const setDataGridNoteTypeId = useCallback(
    (noteTypeId: string | null) => {
      setPreferences((currentPreferences) => {
        let labelIds = currentPreferences.dataGrid.labelIds

        if (areLabelsReady) {
          const availableLabelIds = new Set(
            getDataGridLabelOptions(labels, noteTypeId).map((label) => label.id)
          )
          labelIds = intersectPreferenceIds(labelIds, availableLabelIds)
        }

        return {
          ...currentPreferences,
          dataGrid: {
            ...currentPreferences.dataGrid,
            labelIds,
            noteTypeId,
          },
        }
      })
    },
    [areLabelsReady, labels]
  )

  const setDataGridLabelIds = useCallback((labelIds: string[]) => {
    setPreferences((currentPreferences) => ({
      ...currentPreferences,
      dataGrid: {
        ...currentPreferences.dataGrid,
        labelIds: [...new Set(labelIds)],
      },
    }))
  }, [])

  const setDataGridLabelMatchMode = useCallback(
    (labelMatchMode: LabelMatchMode) => {
      setPreferences((currentPreferences) => ({
        ...currentPreferences,
        dataGrid: {
          ...currentPreferences.dataGrid,
          labelMatchMode,
        },
      }))
    },
    []
  )

  const setDataGridColumnWidths = useCallback(
    (dataGridColumnWidths: NotesDataGridColumnWidths) => {
      setPreferences((currentPreferences) => ({
        ...currentPreferences,
        dataGridColumnWidths,
      }))
    },
    []
  )

  const clearFilters = useCallback((viewMode: NotesViewMode) => {
    setPreferences((currentPreferences) => {
      if (viewMode === 'data-grid') {
        return {
          ...currentPreferences,
          dataGrid: {
            ...currentPreferences.dataGrid,
            labelIds: [],
          },
        }
      }

      return {
        ...currentPreferences,
        card: {
          ...currentPreferences.card,
          labelIds: [],
          noteTypeIds: [],
        },
      }
    })
  }, [])

  useEffect(() => {
    if (!reconciledFilterPreferences || areFiltersReconciled) {
      return
    }

    setPreferences(reconciledFilterPreferences)
  }, [areFiltersReconciled, reconciledFilterPreferences])

  useEffect(() => {
    if (!reconciledColumnWidths || areColumnWidthsReconciled) {
      return
    }

    setPreferences((currentPreferences) => ({
      ...currentPreferences,
      dataGridColumnWidths: reconciledColumnWidths,
    }))
  }, [areColumnWidthsReconciled, reconciledColumnWidths])

  useEffect(() => {
    if (!areFiltersReconciled || !areColumnWidthsReconciled) {
      return
    }

    writeNotesViewPreferences(preferences, storage)
  }, [areColumnWidthsReconciled, areFiltersReconciled, preferences, storage])

  return {
    areFiltersReconciled,
    clearFilters,
    preferences,
    setCardLabelIds,
    setCardLabelMatchMode,
    setCardNoteTypeIds,
    setDataGridColumnWidths,
    setDataGridLabelIds,
    setDataGridLabelMatchMode,
    setDataGridNoteTypeId,
    setViewMode,
  }
}
