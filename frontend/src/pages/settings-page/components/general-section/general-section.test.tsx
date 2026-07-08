import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GeneralSettingsDto } from '../../../../types/api';
import '../../../../i18n';
import { AppProviders } from '../../../../components/app-providers/app-providers';
import { GeneralSection } from './general-section';

const useGeneralSettingsQueryMock = vi.hoisted(() => vi.fn());
const useUpdateGeneralSettingsMutationMock = vi.hoisted(() => vi.fn());

vi.mock('../../hooks/use-general-settings-query', () => ({
  useGeneralSettingsQuery: useGeneralSettingsQueryMock,
}));

vi.mock('../../hooks/use-update-general-settings-mutation', () => ({
  useUpdateGeneralSettingsMutation: useUpdateGeneralSettingsMutationMock,
}));

const generalSettings: GeneralSettingsDto = {
  cardFieldDisplayCount: 3,
  textTruncationLength: 120,
};

const updateMutation = {
  isPending: false,
  mutateAsync: vi.fn(),
};

const renderGeneralSection = () => {
  return render(
    <AppProviders>
      <GeneralSection />
    </AppProviders>,
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  useGeneralSettingsQueryMock.mockReturnValue({
    data: generalSettings,
    isError: false,
    isLoading: false,
  });
  updateMutation.isPending = false;
  updateMutation.mutateAsync.mockResolvedValue(generalSettings);
  useUpdateGeneralSettingsMutationMock.mockReturnValue(updateMutation);
});

afterEach(() => {
  cleanup();
});

describe('GeneralSection', () => {
  it('renders loaded settings and saves positive integer values', async () => {
    renderGeneralSection();

    expect((screen.getByLabelText('Text truncation character count') as HTMLInputElement).value).toBe('120');
    expect((screen.getByLabelText('Fields displayed on cards') as HTMLInputElement).value).toBe('3');

    fireEvent.change(screen.getByLabelText('Text truncation character count'), {
      target: { value: '180' },
    });
    fireEvent.change(screen.getByLabelText('Fields displayed on cards'), {
      target: { value: '5' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }));

    await waitFor(() => {
      expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
        cardFieldDisplayCount: 5,
        textTruncationLength: 180,
      });
    });

    expect(await screen.findByText('General settings were saved.')).toBeTruthy();
  });

  it('submits null values when both optional fields are cleared', async () => {
    renderGeneralSection();

    fireEvent.change(screen.getByLabelText('Text truncation character count'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('Fields displayed on cards'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }));

    await waitFor(() => {
      expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
        cardFieldDisplayCount: null,
        textTruncationLength: null,
      });
    });
  });

  it('shows blur-time validation and blocks invalid values before submit', async () => {
    renderGeneralSection();

    fireEvent.change(screen.getByLabelText('Text truncation character count'), {
      target: { value: '0' },
    });
    fireEvent.blur(screen.getByLabelText('Text truncation character count'));

    expect(await screen.findByText('Enter a whole number greater than 0.')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Fields displayed on cards'), {
      target: { value: '1.5' },
    });
    fireEvent.blur(screen.getByLabelText('Fields displayed on cards'));
    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }));

    expect(updateMutation.mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByText('Enter a whole number greater than 0.')).toBeTruthy();
  });

  it('shows save failure feedback when the mutation rejects', async () => {
    updateMutation.mutateAsync.mockRejectedValueOnce(new Error('save failed'));
    renderGeneralSection();

    fireEvent.change(screen.getByLabelText('Text truncation character count'), {
      target: { value: '200' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }));

    expect(
      await screen.findByText('General settings could not be saved. Try again.'),
    ).toBeTruthy();
  });

  it('shows loading and query error states', () => {
    useGeneralSettingsQueryMock.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: true,
    });

    renderGeneralSection();
    expect(screen.getByText('Loading general settings...')).toBeTruthy();

    cleanup();

    useGeneralSettingsQueryMock.mockReturnValue({
      data: undefined,
      isError: true,
      isLoading: false,
    });

    renderGeneralSection();
    expect(screen.getByText('General settings could not be loaded right now.')).toBeTruthy();
  });
});
