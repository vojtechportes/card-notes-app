import { describe, expect, it } from 'vitest'
import { isExportImportData } from './is-export-import-data.util'

const basePayload = {
  columns: [],
  exportedAt: '2026-07-21T10:00:00.000Z',
  generalSettings: {},
  notes: [],
  noteTypes: [],
}

describe(isExportImportData.name, () => {
  it('accepts version 3 payloads with labels', () => {
    expect(isExportImportData({ ...basePayload, labels: [], version: 3 })).toBe(
      true
    )
  })

  it('accepts immediately previous version 2 payloads without labels', () => {
    expect(isExportImportData({ ...basePayload, version: 2 })).toBe(true)
  })

  it('rejects version 3 payloads without labels and unsupported versions', () => {
    expect(isExportImportData({ ...basePayload, version: 3 })).toBe(false)
    expect(isExportImportData({ ...basePayload, labels: [], version: 1 })).toBe(
      false
    )
  })
})
