import { GeneralSettingsDto } from "../../../../../types/api"
import { emptyFormValues } from "../constants/empty-form-values"
import { GeneralSettingsFormValues } from "../types"

export const mapSettingsToFormValues = (
  settings?: GeneralSettingsDto
): GeneralSettingsFormValues => {
  if (!settings) {
    return emptyFormValues
  }

  return {
    cardFieldDisplayCount: settings.cardFieldDisplayCount?.toString() ?? '',
    textTruncationLength: settings.textTruncationLength?.toString() ?? '',
    mergeDateTimeFields: !!settings.mergeDateTimeFields
  }
}