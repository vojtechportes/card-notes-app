export const createExportFileName = (exportedAt: string) => {
  return `card-notes-export-${exportedAt.replace(/[.:]/g, '-')}.json`
}
