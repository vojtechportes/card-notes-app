import type { LabelDto, NoteTypeDto } from '../../../types/api'
import type { NotesViewPreferences } from '../types/notes-view-preferences'
import { getDataGridLabelOptions } from './get-data-grid-label-options.util'
import { intersectPreferenceIds } from './intersect-preference-ids.util'

export const reconcileNotesViewFilters = (
  preferences: NotesViewPreferences,
  noteTypes: NoteTypeDto[],
  labels: LabelDto[]
): NotesViewPreferences => {
  const noteTypeIds = new Set(noteTypes.map((noteType) => noteType.id))
  const labelIds = new Set(labels.map((label) => label.id))
  const selectedDataGridNoteTypeId = preferences.dataGrid.noteTypeId
  const dataGridNoteTypeId =
    selectedDataGridNoteTypeId && noteTypeIds.has(selectedDataGridNoteTypeId)
      ? selectedDataGridNoteTypeId
      : (noteTypes[0]?.id ?? null)
  const dataGridLabelIds = new Set(
    getDataGridLabelOptions(labels, dataGridNoteTypeId).map((label) => label.id)
  )

  return {
    ...preferences,
    card: {
      ...preferences.card,
      labelIds: intersectPreferenceIds(preferences.card.labelIds, labelIds),
      noteTypeIds: intersectPreferenceIds(
        preferences.card.noteTypeIds,
        noteTypeIds
      ),
    },
    dataGrid: {
      ...preferences.dataGrid,
      labelIds: intersectPreferenceIds(
        preferences.dataGrid.labelIds,
        dataGridLabelIds
      ),
      noteTypeId: dataGridNoteTypeId,
    },
  }
}
