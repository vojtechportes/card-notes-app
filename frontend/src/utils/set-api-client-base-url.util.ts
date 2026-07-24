import { apiClient } from './api-client'

export const setApiClientBaseUrl = (apiBaseUrl: string): void => {
  apiClient.defaults.baseURL = apiBaseUrl
}
