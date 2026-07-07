import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import '../../i18n';
import { AppProviders } from '../app-providers/app-providers';
import { ConfirmationProvider } from './confirmation-provider';
import { useConfirmation } from './use-confirmation';

const ConfirmHarness = () => {
  const confirmation = useConfirmation();
  const [result, setResult] = useState('none');

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          const confirmed = await confirmation.confirm({
            title: 'Delete note?',
            description: 'This action cannot be undone.',
            confirmLabel: 'Delete note',
            variant: 'destructive',
          });

          setResult(confirmed ? 'confirmed' : 'cancelled');
        }}
      >
        Open confirm
      </button>
      <button
        type="button"
        onClick={async () => {
          const choice = await confirmation.choose({
            title: 'Delete column?',
            description: 'Choose how much column data should be removed.',
            choices: [
              {
                value: 'definition',
                label: 'Delete definition only',
                description: 'Existing note values are preserved.',
              },
              {
                value: 'definition-and-values',
                label: 'Delete column and values',
                description: 'Existing note values for this column are removed.',
                destructive: true,
              },
            ],
          });

          setResult(choice ?? 'cancelled');
        }}
      >
        Open choices
      </button>
      <output>{result}</output>
    </>
  );
};

const renderHarness = () => {
  return render(
    <ConfirmationProvider>
      <ConfirmHarness />
    </ConfirmationProvider>,
  );
};

const renderAppProvidersHarness = () => {
  return render(
    <AppProviders>
      <ConfirmHarness />
    </AppProviders>,
  );
};

const expectDialogToClose = async () => {
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).toBeNull();
  });
};

describe('ConfirmationProvider', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders children without showing a dialog by default', () => {
    renderHarness();

    expect(screen.getByRole('button', { name: 'Open confirm' })).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('resolves a confirmation as confirmed', async () => {
    renderHarness();

    fireEvent.click(screen.getByRole('button', { name: 'Open confirm' }));
    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(screen.getByText('This action cannot be undone.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Delete note' }));

    await waitFor(() => {
      expect(screen.getByText('confirmed')).toBeTruthy();
    });
    await expectDialogToClose();
  });

  it('resolves a confirmation as cancelled', async () => {
    renderHarness();

    fireEvent.click(screen.getByRole('button', { name: 'Open confirm' }));
    expect(await screen.findByRole('dialog')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.getByText('cancelled')).toBeTruthy();
    });
    await expectDialogToClose();
  });

  it('resolves close actions as cancelled', async () => {
    renderHarness();

    fireEvent.click(screen.getByRole('button', { name: 'Open confirm' }));
    expect(await screen.findByRole('dialog')).toBeTruthy();

    fireEvent.click(
      screen.getByRole('button', { name: 'Close confirmation dialog' }),
    );

    await waitFor(() => {
      expect(screen.getByText('cancelled')).toBeTruthy();
    });
    await expectDialogToClose();
  });

  it('resolves escape dismissal as cancelled', async () => {
    renderHarness();

    fireEvent.click(screen.getByRole('button', { name: 'Open confirm' }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.keyDown(dialog, {
      key: 'Escape',
      code: 'Escape',
    });

    await waitFor(() => {
      expect(screen.getByText('cancelled')).toBeTruthy();
    });
    await expectDialogToClose();
  });

  it('makes the confirmation service available through AppProviders', async () => {
    renderAppProvidersHarness();

    fireEvent.click(screen.getByRole('button', { name: 'Open confirm' }));
    expect(await screen.findByRole('dialog')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Delete note' }));

    await waitFor(() => {
      expect(screen.getByText('confirmed')).toBeTruthy();
    });
    await expectDialogToClose();
  });

  it('resolves a selected column deletion choice', async () => {
    renderHarness();

    fireEvent.click(screen.getByRole('button', { name: 'Open choices' }));
    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(
      screen.getByText('Choose how much column data should be removed.'),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole('button', { name: /Delete column and values/ }),
    );

    await waitFor(() => {
      expect(screen.getByText('definition-and-values')).toBeTruthy();
    });
    await expectDialogToClose();
  });
});
