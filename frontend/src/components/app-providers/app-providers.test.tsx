import { render, screen } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AppProviders } from './app-providers'

vi.mock('../confirmation', () => ({
  ConfirmationProvider: ({ children }: PropsWithChildren) => children,
}))

vi.mock('../sync-cache-observer/sync-cache-observer', () => ({
  SyncCacheObserver: () => <div data-testid="sync-cache-observer" />,
}))

describe(AppProviders.name, () => {
  it('does not start synchronization observation before the startup gates', () => {
    render(
      <AppProviders>
        <div>content</div>
      </AppProviders>
    )

    expect(screen.getByText('content')).toBeTruthy()
    expect(screen.queryByTestId('sync-cache-observer')).toBeNull()
  })
})
