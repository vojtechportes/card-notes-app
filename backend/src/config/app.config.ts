import { DEFAULT_HOST, DEFAULT_PORT, GLOBAL_API_PREFIX } from '../constants'

export interface AppConfig {
  host: string
  port: number
  globalApiPrefix: string
}

export const appConfig: AppConfig = {
  host: process.env.HOST ?? process.env.BACKEND_HOST ?? DEFAULT_HOST,
  port: Number(process.env.PORT ?? process.env.BACKEND_PORT ?? DEFAULT_PORT),
  globalApiPrefix: GLOBAL_API_PREFIX,
}
