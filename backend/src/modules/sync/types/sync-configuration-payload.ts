import type { SyncColumnPayload } from './sync-column-payload'
import type { SyncConfigurationEntity } from './sync-configuration-entity'
import type { SyncGeneralSettingsPayload } from './sync-general-settings-payload'
import type { SyncLabelPayload } from './sync-label-payload'
import type { SyncNoteTypePayload } from './sync-note-type-payload'

export interface SyncConfigurationPayload {
  noteTypes: Array<SyncConfigurationEntity<SyncNoteTypePayload>>
  columns: Array<SyncConfigurationEntity<SyncColumnPayload>>
  labels: Array<SyncConfigurationEntity<SyncLabelPayload>>
  generalSettings: SyncConfigurationEntity<SyncGeneralSettingsPayload>
}
