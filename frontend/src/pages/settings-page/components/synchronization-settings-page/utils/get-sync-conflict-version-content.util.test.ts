import { describe, expect, it } from 'vitest'
import { getSyncConflictVersionContent } from './get-sync-conflict-version-content.util'

describe('getSyncConflictVersionContent', () => {
  it('recursively projects configuration entities to user content', () => {
    const content = getSyncConflictVersionContent(
      JSON.stringify({
        workspaceId: 'workspace-secret',
        contentHash: 'hash-secret',
        entityType: 'configuration',
        payload: {
          noteTypes: [
            {
              id: 'type-1',
              payload: { name: 'Research notes' },
              mutationId: 'mutation-secret',
              modifiedBy: 'device-secret',
              modifiedAt: '2026-08-04T10:00:00.000Z',
              deletedAt: null,
            },
          ],
          generalSettings: {
            id: 'general',
            payload: { textTruncationLength: 120 },
            mutationId: 'settings-mutation-secret',
            modifiedBy: 'settings-device-secret',
            modifiedAt: '2026-08-04T11:00:00.000Z',
            deletedAt: null,
          },
        },
      })
    )

    expect(content).toContain('Research notes')
    expect(content).toContain('textTruncationLength')
    expect(content).not.toContain('workspace-secret')
    expect(content).not.toContain('hash-secret')
    expect(content).not.toContain('mutationId')
    expect(content).not.toContain('modifiedBy')
    expect(content).not.toContain('modifiedAt')
    expect(content).not.toContain('deletedAt')
  })
})
