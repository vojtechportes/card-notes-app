import type { Label } from '../../settings/types/label'
import type { LabelsColumnConfig } from '../../settings/types/labels-column-config'
import { ImportLabelIssueCodeEnum } from '../types/import-label-issue-code-enum'
import type { ImportLabelIssueDto } from '../types/import-label-issue.dto'

interface SpreadsheetLabelResolution {
  labelIds: string[]
  issues: ImportLabelIssueDto[]
}

export const resolveSpreadsheetLabelIds = (
  cellText: string,
  config: LabelsColumnConfig,
  labels: Label[]
): SpreadsheetLabelResolution => {
  const labelNames = [
    ...new Set(
      cellText
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
    ),
  ]
  const allowedLabels = labels.filter(
    (label) =>
      config.sources === null ||
      (label.noteTypeId === null
        ? config.sources.includeShared
        : config.sources.noteTypeIds.includes(label.noteTypeId))
  )
  const resolvedLabelIds: string[] = []
  const issues: ImportLabelIssueDto[] = []

  for (const name of labelNames) {
    const matches = allowedLabels.filter((label) => label.name === name)

    if (matches.length !== 1) {
      issues.push({
        labelId: null,
        name,
        code: ImportLabelIssueCodeEnum.InvalidReference,
      })
      continue
    }

    resolvedLabelIds.push(matches[0].id)
  }

  return {
    labelIds: config.allowMultiple
      ? resolvedLabelIds
      : resolvedLabelIds.slice(0, 1),
    issues,
  }
}
