import type { OneDriveDeltaPollResult } from './one-drive-delta-poll-result'
import type { OneDriveDeltaTrigger } from './one-drive-delta-trigger'

export type OneDriveDeltaPoll = (
  trigger: OneDriveDeltaTrigger
) => Promise<OneDriveDeltaPollResult>
