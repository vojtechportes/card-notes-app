import type { OneDriveAccountIdentity } from './one-drive-account-identity'

export type OneDriveIdentityProvider = () =>
  OneDriveAccountIdentity | Promise<OneDriveAccountIdentity>
