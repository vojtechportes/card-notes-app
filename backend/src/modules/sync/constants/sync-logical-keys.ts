export const syncLogicalKeys = {
  workspace: 'workspace.json',
  configuration: 'config.json',
  note: (noteId: string): string => `notes/${noteId}.json`,
  asset: (assetId: string, extension: string): string =>
    `assets/${assetId}.${extension}`,
} as const
