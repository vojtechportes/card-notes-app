import { NoteSortDirectionEnum } from './note-sort-direction-enum'
import { NoteSortFieldEnum } from './note-sort-field-enum'

export interface ListNotesOptions {
  noteTypeIds?: string[]
  sortBy?: NoteSortFieldEnum
  sortDirection?: NoteSortDirectionEnum
}
