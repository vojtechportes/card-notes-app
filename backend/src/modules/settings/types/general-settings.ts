export interface GeneralSettings {
  textTruncationLength: number | null
  cardFieldDisplayCount: number | null
  mergeDateTimeFields: boolean | null
}

export interface UpdateGeneralSettingsInput {
  textTruncationLength?: number | null
  cardFieldDisplayCount?: number | null
  mergeDateTimeFields?: boolean | null
}
