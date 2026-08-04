import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SyncConflictDto } from '../../../../../types/api'
import '../../../../../i18n'
import { SyncConflictItem } from './sync-conflict-item'

const mutate = vi.fn()

vi.mock('../../../../../hooks/sync/use-resolve-sync-conflict-mutation', () => ({
  useResolveSyncConflictMutation: () => ({
    isPending: false,
    mutate,
  }),
}))

const conflict: SyncConflictDto = {
  id: 'conflict-1',
  workspaceId: 'workspace-1',
  entityKind: 'note',
  entityId: 'note-1',
  conflictType: 'edit-edit',
  fieldPaths: ['Title'],
  localDocumentJson:
    '{"workspaceId":"workspace-1","contentHash":"local-secret-hash","entityType":"note","deletedAt":null,"payload":{"values":{"field-1":"Local title"},"background":null}}',
  remoteDocumentJson:
    '{"workspaceId":"workspace-1","contentHash":"cloud-secret-hash","entityType":"note","deletedAt":null,"payload":{"values":{"field-1":"Cloud title"},"background":null}}',
  resolutionState: 'unresolved',
  conflictCopyEntityId: 'conflict-copy-1',
  createdAt: '2026-08-04T10:00:00.000Z',
}

describe('SyncConflictItem', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('lets the user inspect both preserved versions before retaining both', async () => {
    render(<SyncConflictItem conflict={conflict} />)

    expect(screen.getByText('Affected content: Title')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Inspect versions' }))

    expect(screen.getByText(/Local title/)).toBeTruthy()
    expect(screen.getByText(/Cloud title/)).toBeTruthy()
    expect(screen.queryByText(/workspaceId/)).toBeNull()
    expect(screen.queryByText(/secret-hash/)).toBeNull()
    fireEvent.click(
      screen.getByRole('button', { name: 'Close version comparison' })
    )
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    fireEvent.click(
      screen.getByRole('button', { name: 'Retain both versions' })
    )

    expect(mutate).toHaveBeenCalledWith({
      id: conflict.id,
      resolution: {
        resolutionState: 'resolved-merged',
        retainBoth: true,
      },
    })
  })

  it('offers explicit keep-one choices without claiming a missing copy exists', () => {
    render(
      <SyncConflictItem
        conflict={{ ...conflict, conflictCopyEntityId: null }}
      />
    )

    expect(
      screen.queryByRole('button', { name: 'Retain both versions' })
    ).toBeNull()

    fireEvent.click(
      screen.getByRole('button', { name: "Keep this device's version" })
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Use the cloud version' })
    )

    expect(mutate).toHaveBeenNthCalledWith(1, {
      id: conflict.id,
      resolution: { resolutionState: 'resolved-local' },
    })
    expect(mutate).toHaveBeenNthCalledWith(2, {
      id: conflict.id,
      resolution: { resolutionState: 'resolved-remote' },
    })
  })
})
