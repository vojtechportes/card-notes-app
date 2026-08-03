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
  it('always mounts synchronization cache observation', () => {
    render(
      <AppProviders>
        <div>content</div>
      </AppProviders>
    )

    expect(screen.getByTestId('sync-cache-observer')).toBeTruthy()
  })
})
