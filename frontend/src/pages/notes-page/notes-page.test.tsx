import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ColumnDto, GeneralSettingsDto, NoteDto } from '../../types/api';
import '../../i18n';
import { NotesPage } from './notes-page';

const useCreateNoteMutationMock = vi.hoisted(() => vi.fn());
const useGeneralSettingsQueryMock = vi.hoisted(() => vi.fn());
const useNoteColumnsQueryMock = vi.hoisted(() => vi.fn());
const useNotesQueryMock = vi.hoisted(() => vi.fn());
const useNotesSearchMock = vi.hoisted(() => vi.fn());
const useUpdateNoteMutationMock = vi.hoisted(() => vi.fn());

vi.mock('./hooks/use-general-settings-query', () => ({
  useGeneralSettingsQuery: useGeneralSettingsQueryMock,
}));

vi.mock('./hooks/use-note-columns-query', () => ({
  useNoteColumnsQuery: useNoteColumnsQueryMock,
}));

vi.mock('./hooks/use-notes-query', () => ({
  useCreateNoteMutation: useCreateNoteMutationMock,
  useNotesQuery: useNotesQueryMock,
  useUpdateNoteMutation: useUpdateNoteMutationMock,
}));

vi.mock('./hooks/use-notes-search', () => ({
  useNotesSearch: useNotesSearchMock,
}));

const columns: ColumnDto[] = [
  {
    config: null,
    createdAt: '2026-07-07T10:00:00.000Z',
    id: 'created-column',
    isDefault: true,
    isHidden: true,
    name: 'createdAt',
    sortOrder: 0,
    title: 'Created at',
    type: 'date',
    updatedAt: '2026-07-07T10:00:00.000Z',
  },
  {
    config: null,
    createdAt: '2026-07-07T10:00:00.000Z',
    id: 'updated-column',
    isDefault: true,
    isHidden: true,
    name: 'updatedAt',
    sortOrder: 1,
    title: 'Updated at',
    type: 'date',
    updatedAt: '2026-07-07T10:00:00.000Z',
  },
  {
    config: null,
    createdAt: '2026-07-07T10:00:00.000Z',
    id: 'title-column',
    isDefault: false,
    isHidden: false,
    name: 'title',
    sortOrder: 2,
    title: 'Title',
    type: 'text',
    updatedAt: '2026-07-07T10:00:00.000Z',
  },
];

const generalSettings: GeneralSettingsDto = {
  cardFieldDisplayCount: null,
  textTruncationLength: null,
};

const notes: NoteDto[] = [
  {
    createdAt: '2026-07-07T10:00:00.000Z',
    id: 'note-1',
    updatedAt: '2026-07-07T12:00:00.000Z',
    values: { 'title-column': 'Alpha note' },
  },
];

const secondNote: NoteDto = {
  createdAt: '2026-07-07T11:00:00.000Z',
  id: 'note-2',
  updatedAt: '2026-07-07T13:00:00.000Z',
  values: { 'title-column': 'Beta note' },
};

describe('NotesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCreateNoteMutationMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
    useGeneralSettingsQueryMock.mockReturnValue({
      data: generalSettings,
      isError: false,
      isLoading: false,
    });
    useNoteColumnsQueryMock.mockReturnValue({
      data: columns,
      isError: false,
      isLoading: false,
    });
    useNotesQueryMock.mockReturnValue({
      data: notes,
      isError: false,
      isLoading: false,
    });
    useNotesSearchMock.mockReturnValue(notes);
    useUpdateNoteMutationMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
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

  it('renders note cards instead of the placeholder preview cards', () => {
    render(<NotesPage />);

    expect(screen.getByText('Alpha note')).toBeTruthy();
    expect(screen.queryByText('Structured fields')).toBeNull();
  });

  it('shows a card configuration error when note columns or general settings fail to load', () => {
    useGeneralSettingsQueryMock.mockReturnValue({
      data: undefined,
      isError: true,
      isLoading: false,
    });

    render(<NotesPage />);

    expect(screen.getByText('Card configuration could not be loaded.')).toBeTruthy();
    expect(screen.queryByText('Alpha note')).toBeNull();
  });

  it('opens and closes the create note dialog from the toolbar action', async () => {
    render(<NotesPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Add note' }));

    expect(screen.getByRole('dialog', { name: 'Create note' })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Title' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Create note' })).toBeNull();
    });
  });

  it('opens the edit dialog from a note card with the existing note values', () => {
    render(<NotesPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.getByRole('dialog', { name: 'Edit note' })).toBeTruthy();
    expect((screen.getByRole('textbox', { name: 'Title' }) as HTMLInputElement).value).toBe(
      'Alpha note',
    );
  });
});
