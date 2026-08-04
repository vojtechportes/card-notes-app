import type { SyncPairingOperationDto } from '../../../../../types/api'

export const getPairingDecisions = (
  mode: SyncPairingOperationDto['mode']
): Array<NonNullable<SyncPairingOperationDto['decision']>> => {
  switch (mode) {
    case 'seed':
      return ['seed']
    case 'restore':
      return ['restore']
    case 'reconcile':
      return ['reconcile']
    case 'mismatch':
      return ['merge', 'replace-local', 'replace-remote']
  }
}
