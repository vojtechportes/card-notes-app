import type { LabelsColumnSources } from './labels-column-sources'

export interface LabelsColumnConfig {
  allowMultiple: boolean
  sources: LabelsColumnSources | null
}
