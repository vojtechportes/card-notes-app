export interface GoogleDriveErrorResponse {
  error?: {
    errors?: Array<{ reason?: string }>
  }
}
