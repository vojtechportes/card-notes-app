import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type {
  ColumnDto,
  GeneralSettingsDto,
  LabelDto,
  NoteDto,
} from '../../../types/api'
import '../../../i18n'
import { NoteCard } from './note-card/note-card'
import { NoteDetailPanel } from './note-detail-panel/note-detail-panel'

const column: ColumnDto = {
  config: { allowMultiple: true, sources: null },
  createdAt: '2026-07-21T10:00:00.000Z',
  id: 'labels-column',
  isDefault: false,
  isHidden: false,
  name: 'topics',
  noteTypeId: 'note-type-1',
  sortOrder: 0,
  title: 'Topics',
  type: 'labels',
  updatedAt: '2026-07-21T10:00:00.000Z',
}

const generalSettings: GeneralSettingsDto = {
  cardFieldDisplayCount: null,
  mergeDateTimeFields: false,
  textTruncationLength: null,
}

const labels: LabelDto[] = [
  {
    color: '#D20A0A',
    createdAt: '2026-07-21T10:00:00.000Z',
    id: 'urgent-label',
    name: 'urgent',
    noteTypeId: null,
    title: 'Urgent',
    updatedAt: '2026-07-21T10:00:00.000Z',
  },
]

const note: NoteDto = {
  createdAt: '2026-07-21T10:00:00.000Z',
  id: 'note-1',
  noteTypeId: 'note-type-1',
  updatedAt: '2026-07-21T10:00:00.000Z',
  values: { 'labels-column': ['urgent-label'] },
}

afterEach(cleanup)

describe('note label rendering', () => {
  it('renders assigned labels as small filled chips on cards and in details', () => {
    render(
      <>
        <NoteCard
          columns={[column]}
          generalSettings={generalSettings}
          labels={labels}
          note={note}
        />
        <NoteDetailPanel
          columns={[column]}
          generalSettings={generalSettings}
          labels={labels}
          note={note}
        />
      </>
    )

    expect(screen.getAllByText('Urgent')).toHaveLength(2)
    expect(
      document.querySelectorAll('.MuiChip-sizeSmall.MuiChip-filled')
    ).toHaveLength(2)
  })
})
