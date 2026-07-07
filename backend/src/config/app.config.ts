import { DEFAULT_PORT, GLOBAL_API_PREFIX } from '../constants';

export interface AppConfig {
  port: number;
  globalApiPrefix: string;
}

export const appConfig: AppConfig = {
  port: Number(process.env.PORT ?? process.env.BACKEND_PORT ?? DEFAULT_PORT),
  globalApiPrefix: GLOBAL_API_PREFIX,
};
