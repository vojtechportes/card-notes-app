import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { format, parseISO } from 'date-fns'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../../../../i18n'
import { DATE_TIME_FORMAT } from '../../../../constants/date-time-format'
import type {
  ColumnDto,
  GeneralSettingsDto,
  NoteDto,
} from '../../../../types/api'
import { NoteCardList } from './note-card-list'

const createColumn = (overrides: Partial<ColumnDto>): ColumnDto => {
  return {
    config: null,
    createdAt: '2026-07-07T10:00:00.000Z',
    id: 'column-id',
    noteTypeId: 'note-type-1',
    isDefault: false,
    isHidden: false,
    name: 'column-name',
    sortOrder: 0,
    title: 'Column title',
    type: 'text',
    updatedAt: '2026-07-07T10:00:00.000Z',
    ...overrides,
  }
}

const generalSettings: GeneralSettingsDto = {
  cardFieldDisplayCount: null,
  textTruncationLength: null,
  mergeDateTimeFields: null,
}

const openCardMenu = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'More actions' }))

  return {
    delete: await screen.findByRole('menuitem', { name: 'Delete' }),
    edit: screen.queryByRole('menuitem', { name: 'Edit' }),
  }
}

afterEach(() => {
  cleanup()
})

describe('NoteCardList', () => {
  it('renders cards in a linear field flow with separators, truncated text, external links, and wide images', () => {
    const note: NoteDto = {
      createdAt: '2026-07-07T10:00:00.000Z',
      id: 'note-1',
      noteTypeId: 'note-type-1',
      updatedAt: '2026-07-07T12:00:00.000Z',
      values: {
        'image-column': {
          altText: 'Invoice image',
          dataUrl: 'data:image/png;base64,abc123',
          fileName: 'invoice.png',
        },
        'link-column': 'https://example.com/very/long/reference',
        'text-column': 'Alpha note with a long summary',
      },
    }

    render(
      <NoteCardList
        columns={[
          createColumn({
            id: 'text-column',
            name: 'summary',
            sortOrder: 0,
            title: 'Summary',
          }),
          createColumn({
            id: 'link-column',
            name: 'source',
            sortOrder: 1,
            title: 'Source',
            type: 'link',
          }),
          createColumn({
            id: 'image-column',
            name: 'receipt',
            sortOrder: 2,
            title: 'Receipt',
            type: 'image',
          }),
        ]}
        generalSettings={{
          ...generalSettings,
          textTruncationLength: 12,
        }}
        notes={[note]}
      />
    )

    expect(screen.getByRole('heading', { name: 'Summary' })).toBeTruthy()
    expect(screen.getByText('Alpha not...')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Source' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Receipt' })).toBeTruthy()
    expect(screen.getAllByRole('separator')).toHaveLength(2)

    const sourceLink = screen.getByRole('link', { name: 'https://e...' })
    expect(sourceLink.getAttribute('href')).toBe(
      'https://example.com/very/long/reference'
    )
    expect(sourceLink.getAttribute('target')).toBe('_blank')

    const image = screen.getByRole('img', { name: 'Invoice image' })
    expect(image.getAttribute('src')).toBe('data:image/png;base64,abc123')
    expect(screen.getByText('invoice.png')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Invoice image' })).toBeNull()
    expect(
      screen.queryByRole('button', { name: 'Close image preview' })
    ).toBeNull()
  })

  it('renders multi-image fields as the first card image plus a remaining count tile', () => {
    render(
      <NoteCardList
        columns={[
          createColumn({
            config: { isMultiImage: true },
            id: 'image-column',
            name: 'printscreen',
            sortOrder: 0,
            title: 'Printscreen',
            type: 'image',
          }),
        ]}
        generalSettings={generalSettings}
        notes={[
          {
            createdAt: '2026-07-07T10:00:00.000Z',
            id: 'note-1',
            noteTypeId: 'note-type-1',
            updatedAt: '2026-07-07T12:00:00.000Z',
            values: {
              'image-column': [
                {
                  altText: 'First printscreen',
                  dataUrl: 'data:image/png;base64,first',
                },
                {
                  altText: 'Second printscreen',
                  dataUrl: 'data:image/png;base64,second',
                },
                {
                  altText: 'Third printscreen',
                  dataUrl: 'data:image/png;base64,third',
                },
              ],
            },
          },
        ]}
      />
    )

    expect(screen.getByRole('img', { name: 'First printscreen' })).toBeTruthy()
    expect(screen.queryByRole('img', { name: 'Second printscreen' })).toBeNull()
    expect(screen.getByText('+2')).toBeTruthy()
  })

  it('renders unsafe links as text and suppresses remote image sources', () => {
    render(
      <NoteCardList
        columns={[
          createColumn({
            id: 'link-column',
            name: 'source',
            sortOrder: 0,
            title: 'Source',
            type: 'link',
          }),
          createColumn({
            id: 'image-column',
            name: 'receipt',
            sortOrder: 1,
            title: 'Receipt',
            type: 'image',
          }),
        ]}
        generalSettings={generalSettings}
        notes={[
          {
            createdAt: '2026-07-07T10:00:00.000Z',
            id: 'note-1',
            noteTypeId: 'note-type-1',
            updatedAt: '2026-07-07T12:00:00.000Z',
            values: {
              'image-column': {
                fileName: 'blocked-image.png',
                url: 'https://example.com/blocked-image.png',
              },
              'link-column': 'javascript:alert(1)',
            },
          },
        ]}
      />
    )

    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('javascript:alert(1)')).toBeTruthy()
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByText('blocked-image.png')).toBeTruthy()
  })

  it('limits the rendered card fields to the configured count', () => {
    render(
      <NoteCardList
        columns={[
          createColumn({
            id: 'summary-column',
            name: 'summary',
            sortOrder: 0,
            title: 'Summary',
          }),
          createColumn({
            id: 'owner-column',
            name: 'owner',
            sortOrder: 1,
            title: 'Owner',
          }),
        ]}
        generalSettings={{
          cardFieldDisplayCount: 1,
          textTruncationLength: null,
          mergeDateTimeFields: false,
        }}
        notes={[
          {
            createdAt: '2026-07-07T10:00:00.000Z',
            id: 'note-1',
            noteTypeId: 'note-type-1',
            updatedAt: '2026-07-07T12:00:00.000Z',
            values: {
              'owner-column': 'Morgan',
              'summary-column': 'Alpha note',
            },
          },
        ]}
      />
    )

    expect(screen.getByRole('heading', { name: 'Summary' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Owner' })).toBeNull()
  })

  it('merges created and updated timestamps into one card field when enabled', () => {
    const expectedTimestamp = format(
      parseISO('2026-07-07T12:00:00.000Z'),
      DATE_TIME_FORMAT
    )

    render(
      <NoteCardList
        columns={[
          createColumn({
            id: 'created-column',
            isDefault: true,
            name: 'createdAt',
            sortOrder: 0,
            title: 'Created at',
            type: 'date',
          }),
          createColumn({
            id: 'updated-column',
            isDefault: true,
            name: 'updatedAt',
            sortOrder: 1,
            title: 'Updated at',
            type: 'date',
          }),
        ]}
        generalSettings={{
          ...generalSettings,
          mergeDateTimeFields: true,
        }}
        notes={[
          {
            createdAt: '2026-07-07T10:00:00.000Z',
            id: 'note-1',
            noteTypeId: 'note-type-1',
            updatedAt: '2026-07-07T12:00:00.000Z',
            values: {},
          },
        ]}
      />
    )

    expect(
      screen.getByRole('heading', { name: 'Last updated at' })
    ).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Created at' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Updated at' })).toBeNull()
    expect(screen.getByText(expectedTimestamp)).toBeTruthy()
  })

  it('opens note detail from the card surface and marks the selected card', () => {
    const handleOpenNoteDetail = vi.fn()
    const note: NoteDto = {
      createdAt: '2026-07-07T10:00:00.000Z',
      id: 'note-1',
      noteTypeId: 'note-type-1',
      updatedAt: '2026-07-07T12:00:00.000Z',
      values: {
        'summary-column': 'Alpha note',
      },
    }

    render(
      <NoteCardList
        columns={[
          createColumn({
            id: 'summary-column',
            name: 'summary',
            sortOrder: 0,
            title: 'Summary',
          }),
        ]}
        generalSettings={generalSettings}
        notes={[note]}
        onOpenNoteDetail={handleOpenNoteDetail}
        selectedNoteId="note-1"
      />
    )

    fireEvent.click(screen.getByText('Alpha note'))

    expect(handleOpenNoteDetail).toHaveBeenCalledWith(note)
    expect(
      screen
        .getByRole('button', { name: /Open detail for/i })
        .getAttribute('aria-pressed')
    ).toBe('true')
  })

  it('does not open note detail when a card link is pressed', () => {
    const handleOpenNoteDetail = vi.fn()

    render(
      <NoteCardList
        columns={[
          createColumn({
            id: 'link-column',
            name: 'source',
            sortOrder: 0,
            title: 'Source',
            type: 'link',
          }),
        ]}
        generalSettings={generalSettings}
        notes={[
          {
            createdAt: '2026-07-07T10:00:00.000Z',
            id: 'note-1',
            noteTypeId: 'note-type-1',
            updatedAt: '2026-07-07T12:00:00.000Z',
            values: {
              'link-column': 'https://example.com/reference',
            },
          },
        ]}
        onOpenNoteDetail={handleOpenNoteDetail}
      />
    )

    fireEvent.click(
      screen.getByRole('link', { name: 'https://example.com/reference' })
    )

    expect(handleOpenNoteDetail).not.toHaveBeenCalled()
  })

  it('calls the edit handler when a card edit action is pressed from the menu', async () => {
    const handleEditNote = vi.fn()
    const note: NoteDto = {
      createdAt: '2026-07-07T10:00:00.000Z',
      id: 'note-1',
      noteTypeId: 'note-type-1',
      updatedAt: '2026-07-07T12:00:00.000Z',
      values: {
        'summary-column': 'Alpha note',
      },
    }

    render(
      <NoteCardList
        columns={[
          createColumn({
            id: 'summary-column',
            name: 'summary',
            sortOrder: 0,
            title: 'Summary',
          }),
        ]}
        generalSettings={generalSettings}
        notes={[note]}
        onEditNote={handleEditNote}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'More actions' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }))

    expect(handleEditNote).toHaveBeenCalledWith(note)
  })

  it('calls the delete handler when a card delete action is pressed from the menu', async () => {
    const handleDeleteNote = vi.fn()
    const note: NoteDto = {
      createdAt: '2026-07-07T10:00:00.000Z',
      id: 'note-1',
      noteTypeId: 'note-type-1',
      updatedAt: '2026-07-07T12:00:00.000Z',
      values: {
        'summary-column': 'Alpha note',
      },
    }

    render(
      <NoteCardList
        columns={[
          createColumn({
            id: 'summary-column',
            name: 'summary',
            sortOrder: 0,
            title: 'Summary',
          }),
        ]}
        generalSettings={generalSettings}
        notes={[note]}
        onDeleteNote={handleDeleteNote}
      />
    )

    const actions = await openCardMenu()
    fireEvent.click(actions.delete)

    expect(handleDeleteNote).toHaveBeenCalledWith(note)
  })

  it('formats default timestamp columns and shows an empty state when there are no notes', () => {
    const expectedTimestamp = format(
      parseISO('2026-07-07T10:00:00.000Z'),
      DATE_TIME_FORMAT
    )

    const { rerender } = render(
      <NoteCardList
        columns={[
          createColumn({
            id: 'created-column',
            isDefault: true,
            name: 'createdAt',
            sortOrder: 0,
            title: 'Created at',
            type: 'date',
          }),
        ]}
        generalSettings={generalSettings}
        notes={[
          {
            createdAt: '2026-07-07T10:00:00.000Z',
            id: 'note-1',
            noteTypeId: 'note-type-1',
            updatedAt: '2026-07-07T12:00:00.000Z',
            values: {},
          },
        ]}
      />
    )

    expect(screen.getByText(expectedTimestamp)).toBeTruthy()

    rerender(
      <NoteCardList columns={[]} generalSettings={generalSettings} notes={[]} />
    )

    expect(
      screen.getByRole('heading', { name: 'No notes to show' })
    ).toBeTruthy()
    expect(
      screen.getByText(
        'Add a note or adjust your filters to populate the masonry list.'
      )
    ).toBeTruthy()
  })
})
