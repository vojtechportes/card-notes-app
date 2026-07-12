export type ImportFileKind = 'json' | 'xlsx' | null

export const getImportFileKind = (file: File | null): ImportFileKind => {
  if (!file) {
    return null
  }

  const normalizedName = file.name.toLowerCase()

  if (normalizedName.endsWith('.xlsx')) {
    return 'xlsx'
  }

  if (normalizedName.endsWith('.json')) {
    return 'json'
  }

  return file.type.includes('spreadsheetml') ? 'xlsx' : 'json'
}
