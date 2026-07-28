import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '../../../../i18n'
import type {
  ColumnDto,
  GeneralSettingsDto,
  NoteDto,
} from '../../../../types/api'
import { NoteDetailPanel } from './note-detail-panel'

const createColumn = (overrides: Partial<ColumnDto>): ColumnDto => ({
  config: null,
  createdAt: '2026-07-07T10:00:00.000Z',
  id: 'column-id',
  isDefault: false,
  isHidden: false,
  isHiddenInDetail: false,
  name: 'column-name',
  noteTypeId: 'note-type-1',
  sortOrder: 0,
  title: 'Column title',
  type: 'text',
  updatedAt: '2026-07-07T10:00:00.000Z',
  ...overrides,
})

const generalSettings: GeneralSettingsDto = {
  cardFieldDisplayCount: null,
  mergeDateTimeFields: false,
  textTruncationLength: 8,
}

const note: NoteDto = {
  createdAt: '2026-07-07T10:00:00.000Z',
  id: 'note-1',
  noteTypeId: 'note-type-1',
  updatedAt: '2026-07-07T12:00:00.000Z',
  values: {
    'detail-hidden': 'This value stays hidden',
    'list-hidden': 'This full detail value is not truncated',
    link: 'https://example.com/complete-reference',
  },
}

describe('NoteDetailPanel', () => {
  it('uses detail visibility independently and renders text and links in full', () => {
    render(
      <NoteDetailPanel
        columns={[
          createColumn({
            id: 'list-hidden',
            isHidden: true,
            name: 'listHidden',
            title: 'List hidden field',
          }),
          createColumn({
            id: 'detail-hidden',
            isHiddenInDetail: true,
            name: 'detailHidden',
            title: 'Detail hidden field',
          }),
          createColumn({
            id: 'link',
            name: 'link',
            sortOrder: 2,
            title: 'Reference',
            type: 'link',
          }),
        ]}
        generalSettings={generalSettings}
        labels={[]}
        note={note}
      />
    )

    expect(screen.getByText('List hidden field')).toBeTruthy()
    expect(
      screen.getByText('This full detail value is not truncated')
    ).toBeTruthy()
    expect(screen.queryByText('Detail hidden field')).toBeNull()
    expect(
      screen.getByRole('link', {
        name: 'https://example.com/complete-reference',
      })
    ).toBeTruthy()
  })
})
