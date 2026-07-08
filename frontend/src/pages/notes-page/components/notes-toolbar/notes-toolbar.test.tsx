import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../../../i18n';
import { NotesToolbar } from './notes-toolbar';
import type { NoteSortBy, NoteSortDirection } from './notes-toolbar';

const createProps = () => ({
  onAddNote: vi.fn(),
  onSearchQueryChange: vi.fn(),
  onSortByChange: vi.fn<(sortBy: NoteSortBy) => void>(),
  onSortDirectionChange: vi.fn<(sortDirection: NoteSortDirection) => void>(),
  searchQuery: '',
  sortBy: 'updatedAt' as NoteSortBy,
  sortDirection: 'desc' as NoteSortDirection,
});

describe('NotesToolbar', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders search, sort, and add note controls', () => {
    render(<NotesToolbar {...createProps()} />);

    expect(screen.getByRole('textbox', { name: 'Search notes' })).toBeTruthy();
    expect(screen.getByLabelText('Sort by')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ascending' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Descending' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add note' })).toBeTruthy();
  });

  it('notifies when the search query changes', () => {
    const props = createProps();
    render(<NotesToolbar {...props} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Search notes' }), {
      target: { value: 'alpha' },
    });

    expect(props.onSearchQueryChange).toHaveBeenCalledWith('alpha');
  });

  it('notifies when the sort field changes', () => {
    const props = createProps();
    render(<NotesToolbar {...props} />);

    fireEvent.change(screen.getByLabelText('Sort by'), {
      target: { value: 'createdAt' },
    });

    expect(props.onSortByChange).toHaveBeenCalledWith('createdAt');
  });

  it('notifies when the sort direction changes', () => {
    const props = createProps();
    render(<NotesToolbar {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ascending' }));

    expect(props.onSortDirectionChange).toHaveBeenCalledWith('asc');
  });

  it('notifies when adding a note is requested', () => {
    const props = createProps();
    render(<NotesToolbar {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add note' }));

    expect(props.onAddNote).toHaveBeenCalled();
  });
});
