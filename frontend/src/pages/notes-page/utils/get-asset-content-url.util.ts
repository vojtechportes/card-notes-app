import { API_BASE_URL } from '../../../constants/api-base-url'
import { apiClient } from '../../../utils/api-client'

export const getAssetContentUrl = (assetId: string): string => {
  return apiClient.getUri({
    baseURL: apiClient.defaults.baseURL ?? API_BASE_URL,
    url: '/assets/' + encodeURIComponent(assetId) + '/content',
  })
}
