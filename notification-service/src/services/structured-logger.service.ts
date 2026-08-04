import type { RelayLogEntry } from '../types/relay-log-entry'

export class StructuredLoggerService {
  public write(entry: RelayLogEntry): void {
    console.log(
      JSON.stringify({
        service: 'notestack-notification-service',
        event: entry.event,
        outcome: entry.outcome,
        code: entry.code,
        durationMs: entry.durationMs,
        count: entry.count,
      })
    )
  }
}
