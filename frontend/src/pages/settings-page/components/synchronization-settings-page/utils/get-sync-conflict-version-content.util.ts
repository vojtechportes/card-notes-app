interface SyncConflictDocument {
  entityType?: string
  deletedAt?: string | null
  payload?: unknown
}

interface NotePayload {
  background?: unknown
  values?: Record<string, unknown>
}

export const getSyncConflictVersionContent = (
  documentJson: string | null | undefined
): string | null => {
  if (!documentJson) {
    return null
  }

  try {
    const document = JSON.parse(documentJson) as SyncConflictDocument
    if (document.entityType === 'note' && document.payload) {
      const payload = document.payload as NotePayload
      const content = {
        values: payload.values ? Object.values(payload.values) : payload,
        background: payload.background ?? null,
        deleted: Boolean(document.deletedAt),
      }

      return JSON.stringify(content, null, 2)
    }

    if (document.payload !== undefined) {
      return JSON.stringify(
        document.payload,
        (key, value) => {
          if (
            key === 'mutationId' ||
            key === 'modifiedBy' ||
            key === 'modifiedAt' ||
            key === 'deletedAt'
          ) {
            return undefined
          }

          return value
        },
        2
      )
    }

    return null
  } catch {
    return null
  }
}
