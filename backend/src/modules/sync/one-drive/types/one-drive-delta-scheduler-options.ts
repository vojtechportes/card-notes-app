import type { OneDriveDeltaPoll } from './one-drive-delta-poll'

export interface OneDriveDeltaSchedulerOptions {
  poll: OneDriveDeltaPoll
  enabled?: boolean
  active?: boolean
  random?: () => number
  scheduleTimeout?: typeof setTimeout
  cancelTimeout?: typeof clearTimeout
}
