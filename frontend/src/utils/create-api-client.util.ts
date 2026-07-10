import axios, { AxiosHeaders } from 'axios'
import { API_BASE_URL } from '../constants/api-base-url'

const isFormDataPayload = (value: unknown): value is FormData => {
  return typeof FormData !== 'undefined' && value instanceof FormData
}

export const createApiClient = (baseURL = API_BASE_URL) => {
  const client = axios.create()

  client.interceptors.request.use((config) => {
    config.baseURL = config.baseURL ?? baseURL
    config.headers = AxiosHeaders.from(config.headers)

    if (isFormDataPayload(config.data)) {
      config.headers.delete('Content-Type')
      return config
    }

    if (!config.headers.has('Content-Type')) {
      config.headers.set('Content-Type', 'application/json')
    }

    return config
  })

  return client
}
