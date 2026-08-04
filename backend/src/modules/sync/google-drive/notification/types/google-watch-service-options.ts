import type { GoogleDriveFetch } from '../../types/google-drive-fetch'

export interface GoogleWatchServiceOptions {
  fetchImplementation?: GoogleDriveFetch
  now?: () => number
}
