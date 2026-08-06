import { Injectable, Logger } from '@nestjs/common'
import {
  allowedRuntimeHttpMethods,
  allowedRuntimePairingErrorCodes,
  allowedRuntimePairingOperations,
  allowedRuntimeProviders,
  allowedRuntimeSyncClassifications,
  allowedRuntimeSyncTriggers,
} from './constants/runtime-diagnostic-allowlists'
import { getAllowedRuntimeDiagnosticValue } from './utils/get-allowed-runtime-diagnostic-value.util'
import { getRuntimeDiagnosticStatus } from './utils/get-runtime-diagnostic-status.util'
import { getRuntimeErrorKind } from './utils/get-runtime-error-kind.util'
import { getSanitizedErrorFrames } from './utils/get-sanitized-error-frames.util'
import { getSanitizedRuntimeRouteValue } from './utils/get-sanitized-runtime-route-value.util'

interface ApiFailureInput {
  error: unknown
  method: unknown
  route: unknown
  status: unknown
}

interface PairingFailureInput {
  error: unknown
  errorCode: unknown
  operation: unknown
  provider: unknown
}

interface SyncFailureInput {
  classification: unknown
  error: unknown
  provider: unknown
  trigger: unknown
}

@Injectable()
export class RuntimeDiagnosticsService {
  private readonly logger = new Logger(RuntimeDiagnosticsService.name)

  recordApiFailure(input: ApiFailureInput): void {
    this.write({
      errorKind: getRuntimeErrorKind(input.error),
      frames: getSanitizedErrorFrames(input.error),
      method: getAllowedRuntimeDiagnosticValue(
        input.method,
        allowedRuntimeHttpMethods,
        'UNKNOWN'
      ),
      route: getSanitizedRuntimeRouteValue(input.route),
      status: getRuntimeDiagnosticStatus(input.status),
      type: 'api-failure',
    })
  }

  recordPairingFailure(input: PairingFailureInput): void {
    this.write({
      errorCode: getAllowedRuntimeDiagnosticValue(
        input.errorCode,
        allowedRuntimePairingErrorCodes
      ),
      errorKind: getRuntimeErrorKind(input.error),
      frames: getSanitizedErrorFrames(input.error),
      operation: getAllowedRuntimeDiagnosticValue(
        input.operation,
        allowedRuntimePairingOperations
      ),
      provider: getAllowedRuntimeDiagnosticValue(
        input.provider,
        allowedRuntimeProviders
      ),
      type: 'pairing-failure',
    })
  }

  recordSyncFailure(input: SyncFailureInput): void {
    this.write({
      classification: getAllowedRuntimeDiagnosticValue(
        input.classification,
        allowedRuntimeSyncClassifications
      ),
      errorKind: getRuntimeErrorKind(input.error),
      frames: getSanitizedErrorFrames(input.error),
      provider: getAllowedRuntimeDiagnosticValue(
        input.provider,
        allowedRuntimeProviders
      ),
      trigger: getAllowedRuntimeDiagnosticValue(
        input.trigger,
        allowedRuntimeSyncTriggers
      ),
      type: 'sync-failure',
    })
  }

  private write(diagnostic: object): void {
    this.logger.error('[runtime-diagnostic] ' + JSON.stringify(diagnostic))
  }
}
