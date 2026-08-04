import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SyncPairingOperationDto } from '../../../../../types/api'
import '../../../../../i18n'
import { PairingPreviewDialog } from './pairing-preview-dialog'

const operation: SyncPairingOperationDto = {
  id: 'pairing-1',
  operationType: 'switch',
  targetProvider: 'google-drive',
  accountId: 'account-1',
  localWorkspaceId: 'local-1',
  remoteWorkspaceId: 'remote-1',
  mode: 'mismatch',
  status: 'prepared',
  localIsPopulated: true,
  remoteIsPopulated: true,
  pendingMutationCount: 2,
  retainPendingWork: true,
  createdAt: '2026-08-04T00:00:00.000Z',
  updatedAt: '2026-08-04T00:00:00.000Z',
}

describe('PairingPreviewDialog', () => {
  afterEach(cleanup)

  it('requires an explicit mismatch decision and supports cancellation', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    render(
      <PairingPreviewDialog
        busy={false}
        onCancel={onCancel}
        onConfirm={onConfirm}
        operation={operation}
      />
    )

    expect(screen.getByText(/Both sides contain data/)).toBeTruthy()
    expect(screen.getByText(/2 pending local changes/)).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', { name: 'Merge both workspaces' })
    )
    expect(onConfirm).toHaveBeenCalledWith('merge')

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
