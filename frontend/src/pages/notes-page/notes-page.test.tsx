import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDto } from '../../types/api';
import '../../i18n';
import { NotesPage } from './notes-page';

const useNotesQueryMock = vi.hoisted(() => vi.fn());
const useNotesSearchMock = vi.hoisted(() => vi.fn());

vi.mock('./hooks/use-notes-query', () => ({
  useNotesQuery: useNotesQueryMock,
}));

vi.mock('./hooks/use-notes-search', () => ({
  useNotesSearch: useNotesSearchMock,
}));

const notes: NoteDto[] = [
  {
    createdAt: '2026-07-07T10:00:00.000Z',
    id: 'note-1',
    updatedAt: '2026-07-07T12:00:00.000Z',
    values: { title: 'Alpha note' },
  },
];

const secondNote: NoteDto = {
  createdAt: '2026-07-07T11:00:00.000Z',
  id: 'note-2',
  updatedAt: '2026-07-07T13:00:00.000Z',
  values: { title: 'Beta note' },
};

describe('NotesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNotesQueryMock.mockReturnValue({
      data: notes,
      isError: false,
      isLoading: false,
    });
    useNotesSearchMock.mockReturnValue(notes);
  });

  afterEach(() => {
    cleanup();
  });

  it('fetches notes with the default toolbar sort state', () => {
    render(<NotesPage />);

    expect(useNotesQueryMock).toHaveBeenCalledWith({
      sortBy: 'updatedAt',
      sortDirection: 'desc',
    });
  });

  it('passes loaded notes and search text to the notes search hook', () => {
    render(<NotesPage />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Search notes' }), {
      target: { value: 'alpha' },
    });

    expect(useNotesSearchMock).toHaveBeenLastCalledWith(notes, 'alpha');
  });

  it('renders the visible notes count with plural copy', () => {
    useNotesSearchMock.mockReturnValue([notes[0], secondNote]);

    render(<NotesPage />);

    expect(screen.getByText('2 visible notes')).toBeTruthy();
  });

  it('updates the notes query sort state from the toolbar', () => {
    render(<NotesPage />);

    fireEvent.change(screen.getByLabelText('Sort by'), {
      target: { value: 'createdAt' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ascending' }));

    expect(useNotesQueryMock).toHaveBeenLastCalledWith({
      sortBy: 'createdAt',
      sortDirection: 'asc',
    });
  });

  it('opens and closes the create note dialog from the toolbar action', async () => {
    render(<NotesPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Add note' }));

    expect(screen.getByRole('dialog', { name: 'Create note' })).toBeTruthy();
    expect(screen.getByText('The note editor will be added in the next feature slice.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Create note' })).toBeNull();
    });
  });
});



