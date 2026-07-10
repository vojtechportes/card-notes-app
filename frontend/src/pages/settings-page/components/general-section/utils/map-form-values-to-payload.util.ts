import { GeneralSettingsFormValues } from '../types'

export const mapFormValuesToPayload = (values: GeneralSettingsFormValues) => {
  const cardFieldDisplayCount = values.cardFieldDisplayCount.trim()
  const textTruncationLength = values.textTruncationLength.trim()

  return {
    cardFieldDisplayCount: cardFieldDisplayCount
      ? Number(cardFieldDisplayCount)
      : null,
    textTruncationLength: textTruncationLength
      ? Number(textTruncationLength)
      : null,
    mergeDateTimeFields: !!values.mergeDateTimeFields,
  }
}
