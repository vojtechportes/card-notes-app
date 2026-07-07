export interface GeneralSettings {
  textTruncationLength: number | null;
  cardFieldDisplayCount: number | null;
}

export interface UpdateGeneralSettingsInput {
  textTruncationLength?: number | null;
  cardFieldDisplayCount?: number | null;
}
