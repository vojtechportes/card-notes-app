import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import '../../../../../i18n'
import { LabelNoteFieldValue } from './label-note-field-value'

afterEach(cleanup)

describe('LabelNoteFieldValue', () => {
  it('renders assigned labels and a safe fallback for missing references', () => {
    render(
      <LabelNoteFieldValue
        labelIds={['label-1', 'missing-label']}
        labels={[
          {
            color: '#D20A0A',
            createdAt: '2026-07-21T10:00:00.000Z',
            id: 'label-1',
            name: 'urgent',
            noteTypeId: null,
            title: 'Urgent',
            updatedAt: '2026-07-21T10:00:00.000Z',
          },
        ]}
      />
    )

    expect(screen.getByText('Urgent')).toBeTruthy()
    expect(screen.getByText('Unavailable label')).toBeTruthy()
  })
})
