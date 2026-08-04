import type { SyncPairingOperation } from './sync-pairing-operation'

export interface SyncPairingOperationRow {
  id: string
  operation_type: SyncPairingOperation['operationType']
  target_provider: SyncPairingOperation['targetProvider']
  account_id: string
  account_display_name: string | null
  local_workspace_id: string
  remote_workspace_id: string | null
  remote_workspace_display_name: string | null
  mode: SyncPairingOperation['mode']
  status: SyncPairingOperation['status']
  local_is_populated: number
  remote_is_populated: number
  pending_mutation_count: number
  retain_pending_work: number
  previous_provider: SyncPairingOperation['previousProvider']
  previous_account_id: string | null
  backup_path: string | null
  decision: SyncPairingOperation['decision']
  error_code: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}
