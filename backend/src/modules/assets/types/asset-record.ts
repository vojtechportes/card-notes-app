export interface AssetRecord {
  assetId: string
  extension: string
  integrityState: 'available' | 'missing' | 'corrupt'
  mimeType: string
  relativePath: string
  size: number
}
