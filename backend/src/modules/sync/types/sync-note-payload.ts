import type { BackgroundEnumDto } from '../../notes/types/background-enum.dto'
import type { SyncNoteValue } from './sync-note-value'

export interface SyncNotePayload {
  noteTypeId: string
  background: BackgroundEnumDto | null
  values: Record<string, SyncNoteValue>
}
