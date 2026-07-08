import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n';
import { AppProviders } from '../../components/app-providers/app-providers';
import { SettingsPage } from './settings-page';

const useNoteColumnsQueryMock = vi.hoisted(() => vi.fn());
const useCreateColumnMutationMock = vi.hoisted(() => vi.fn());
const useUpdateColumnMutationMock = vi.hoisted(() => vi.fn());
const useReorderColumnsMutationMock = vi.hoisted(() => vi.fn());
const useDeleteColumnMutationMock = vi.hoisted(() => vi.fn());

vi.mock('./hooks/use-note-columns-query', () => ({
  useNoteColumnsQuery: useNoteColumnsQueryMock,
}));

vi.mock('./hooks/use-create-column-mutation', () => ({
  useCreateColumnMutation: useCreateColumnMutationMock,
}));

vi.mock('./hooks/use-update-column-mutation', () => ({
  useUpdateColumnMutation: useUpdateColumnMutationMock,
}));

vi.mock('./hooks/use-reorder-columns-mutation', () => ({
  useReorderColumnsMutation: useReorderColumnsMutationMock,
}));

vi.mock('./hooks/use-delete-column-mutation', () => ({
  useDeleteColumnMutation: useDeleteColumnMutationMock,
}));

beforeEach(() => {
  useNoteColumnsQueryMock.mockReturnValue({
    data: [],
    isError: false,
    isLoading: false,
  });
  useCreateColumnMutationMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() });
  useUpdateColumnMutationMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() });
  useReorderColumnsMutationMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() });
  useDeleteColumnMutationMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() });
});

describe('SettingsPage', () => {
  it('renders each settings section as its own component shell', () => {
    render(
      <AppProviders>
        <SettingsPage />
      </AppProviders>,
    );

    expect(screen.getByRole('heading', { level: 3, name: 'Columns' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'General' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'Export / Import' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'Danger Zone' })).toBeTruthy();
  });
});
