export const createExportFileName = (exportedAt: string) => {
  return `notestack-export-${exportedAt.replace(/[.:]/g, '-')}.json`
}
