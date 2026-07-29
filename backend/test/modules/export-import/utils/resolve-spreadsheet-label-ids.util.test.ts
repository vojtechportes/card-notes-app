import { describe, expect, it } from 'vitest'
import type { Label } from '../../../../src/modules/settings/types/label'
import type { LabelsColumnConfig } from '../../../../src/modules/settings/types/labels-column-config'
import { resolveSpreadsheetLabelIds } from '../../../../src/modules/export-import/utils/resolve-spreadsheet-label-ids.util'

const labels: Label[] = [
  {
    id: 'shared-one',
    title: 'Label one',
    name: 'label1',
    color: '#111111',
    noteTypeId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'template-two',
    title: 'Label two',
    name: 'label2',
    color: '#222222',
    noteTypeId: 'template-one',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'shared-three',
    title: 'Label three',
    name: 'label3',
    color: '#333333',
    noteTypeId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'template-duplicate',
    title: 'Template duplicate',
    name: 'duplicate',
    color: '#444444',
    noteTypeId: 'template-one',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'shared-duplicate',
    title: 'Shared duplicate',
    name: 'duplicate',
    color: '#555555',
    noteTypeId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
]

const allSourcesConfig: LabelsColumnConfig = {
  allowMultiple: true,
  sources: null,
}

describe(resolveSpreadsheetLabelIds.name, () => {
  it('resolves comma-separated names in order and trims whitespace', () => {
    expect(
      resolveSpreadsheetLabelIds(
        'label1, label2,label3',
        allSourcesConfig,
        labels
      )
    ).toEqual({
      labelIds: ['shared-one', 'template-two', 'shared-three'],
      issues: [],
    })
  })

  it('ignores blank and duplicate names', () => {
    expect(
      resolveSpreadsheetLabelIds(
        'label1, , label1, label3',
        allSourcesConfig,
        labels
      )
    ).toEqual({
      labelIds: ['shared-one', 'shared-three'],
      issues: [],
    })
  })

  it('reports unknown, disallowed, and ambiguous names', () => {
    const result = resolveSpreadsheetLabelIds(
      'missing,label2,duplicate,label1',
      {
        allowMultiple: true,
        sources: {
          includeShared: true,
          noteTypeIds: [],
        },
      },
      labels
    )

    expect(result.labelIds).toEqual(['shared-duplicate', 'shared-one'])
    expect(result.issues).toEqual([
      { labelId: null, name: 'missing', code: 'invalid-reference' },
      { labelId: null, name: 'label2', code: 'invalid-reference' },
    ])

    expect(
      resolveSpreadsheetLabelIds('duplicate', allSourcesConfig, labels).issues
    ).toEqual([{ labelId: null, name: 'duplicate', code: 'invalid-reference' }])
  })

  it('keeps only the first valid name for single-select fields', () => {
    expect(
      resolveSpreadsheetLabelIds(
        'label3,label1',
        { ...allSourcesConfig, allowMultiple: false },
        labels
      ).labelIds
    ).toEqual(['shared-three'])
  })
})
