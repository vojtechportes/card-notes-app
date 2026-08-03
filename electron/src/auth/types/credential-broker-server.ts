import type { CredentialBrokerBootstrap } from './credential-broker-bootstrap.js'

export interface CredentialBrokerServer {
  bootstrap: CredentialBrokerBootstrap
  dispose: () => Promise<void>
}
