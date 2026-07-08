import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { format, parseISO } from 'date-fns';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../../../i18n';
import { DATE_TIME_FORMAT } from '../../../../constants/date-time-format';
import type { ColumnDto, GeneralSettingsDto, NoteDto } from '../../../../types/api';
import { NoteCardList } from './note-card-list';

const createColumn = (overrides: Partial<ColumnDto>): ColumnDto => {
  return {
    config: null,
    createdAt: '2026-07-07T10:00:00.000Z',
    id: 'column-id',
    isDefault: false,
    isHidden: false,
    name: 'column-name',
    sortOrder: 0,
    title: 'Column title',
    type: 'text',
    updatedAt: '2026-07-07T10:00:00.000Z',
    ...overrides,
  };
};

const generalSettings: GeneralSettingsDto = {
  cardFieldDisplayCount: null,
  textTruncationLength: null,
};

afterEach(() => {
  cleanup();
});

describe('NoteCardList', () => {
  it('renders cards in a linear field flow with separators, truncated text, external links, and wide images', () => {
    const note: NoteDto = {
      createdAt: '2026-07-07T10:00:00.000Z',
      id: 'note-1',
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
    };

    render(
      <NoteCardList
        columns={[
          createColumn({ id: 'text-column', name: 'summary', sortOrder: 0, title: 'Summary' }),
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
      />,
    );

    expect(screen.getByRole('heading', { name: 'Summary' })).toBeTruthy();
    expect(screen.getByText('Alpha not...')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Source' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Receipt' })).toBeTruthy();
    expect(screen.getAllByRole('separator')).toHaveLength(2);

    const sourceLink = screen.getByRole('link', { name: 'https://e...' });
    expect(sourceLink.getAttribute('href')).toBe('https://example.com/very/long/reference');
    expect(sourceLink.getAttribute('target')).toBe('_blank');

    const image = screen.getByRole('img', { name: 'Invoice image' });
    expect(image.getAttribute('src')).toBe('data:image/png;base64,abc123');
    expect(screen.getByText('invoice.png')).toBeTruthy();
  });

  it('limits the rendered card fields to the configured count', () => {
    render(
      <NoteCardList
        columns={[
          createColumn({ id: 'summary-column', name: 'summary', sortOrder: 0, title: 'Summary' }),
          createColumn({ id: 'owner-column', name: 'owner', sortOrder: 1, title: 'Owner' }),
        ]}
        generalSettings={{
          cardFieldDisplayCount: 1,
          textTruncationLength: null,
        }}
        notes={[
          {
            createdAt: '2026-07-07T10:00:00.000Z',
            id: 'note-1',
            updatedAt: '2026-07-07T12:00:00.000Z',
            values: {
              'owner-column': 'Morgan',
              'summary-column': 'Alpha note',
            },
          },
        ]}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Summary' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Owner' })).toBeNull();
  });

  it('calls the edit handler when a card edit action is pressed', () => {
    const handleEditNote = vi.fn();
    const note: NoteDto = {
      createdAt: '2026-07-07T10:00:00.000Z',
      id: 'note-1',
      updatedAt: '2026-07-07T12:00:00.000Z',
      values: {
        'summary-column': 'Alpha note',
      },
    };

    render(
      <NoteCardList
        columns={[
          createColumn({ id: 'summary-column', name: 'summary', sortOrder: 0, title: 'Summary' }),
        ]}
        generalSettings={generalSettings}
        notes={[note]}
        onEditNote={handleEditNote}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(handleEditNote).toHaveBeenCalledWith(note);
  });

  it('formats default timestamp columns and shows an empty state when there are no notes', () => {
    const expectedTimestamp = format(
      parseISO('2026-07-07T10:00:00.000Z'),
      DATE_TIME_FORMAT,
    );

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
            updatedAt: '2026-07-07T12:00:00.000Z',
            values: {},
          },
        ]}
      />,
    );

    expect(screen.getByText(expectedTimestamp)).toBeTruthy();

    rerender(
      <NoteCardList
        columns={[]}
        generalSettings={generalSettings}
        notes={[]}
      />,
    );

    expect(screen.getByRole('heading', { name: 'No notes to show' })).toBeTruthy();
    expect(
      screen.getByText('Add a note or adjust your search to populate the masonry list.'),
    ).toBeTruthy();
  });
});
