import type { Readable } from 'node:stream'
import type { CredentialBrokerBootstrap } from './types/credential-broker-bootstrap'
import { isCredentialBrokerBootstrapValid } from './utils/is-credential-broker-bootstrap-valid.util'

export const readCredentialBrokerBootstrap = (
  stream: Readable,
  timeoutMs = 5_000
): Promise<CredentialBrokerBootstrap> => {
  return new Promise((resolve, reject) => {
    let input = ''
    const timeout = setTimeout(
      () => finish(new Error('Broker bootstrap timed out.')),
      timeoutMs
    )

    const finish = (
      error: Error | null,
      value?: CredentialBrokerBootstrap
    ): void => {
      clearTimeout(timeout)
      stream.off('data', handleData)
      stream.off('end', handleEnd)

      if (error || !value) {
        reject(error ?? new Error('Broker bootstrap was invalid.'))
        return
      }

      resolve(value)
    }

    const parseInput = (): void => {
      try {
        const value = JSON.parse(input.trim()) as unknown

        if (!isCredentialBrokerBootstrapValid(value)) {
          finish(new Error('Broker bootstrap was invalid.'))
          return
        }

        finish(null, value)
      } catch {
        finish(new Error('Broker bootstrap was invalid.'))
      }
    }

    const handleData = (chunk: Buffer | string): void => {
      input += chunk.toString()

      if (input.length > 4096) {
        finish(new Error('Broker bootstrap was invalid.'))
        return
      }

      if (input.includes('\n')) {
        parseInput()
      }
    }

    const handleEnd = (): void => parseInput()

    stream.on('data', handleData)
    stream.on('end', handleEnd)
  })
}
