import { OAuthTokenRequestError } from '../errors/oauth-token-request.error.js'
import {
  OAUTH_CALLBACK_TIMEOUT_MS,
  OAUTH_EXPIRY_SKEW_MS,
} from '../constants/oauth-security.constants.js'
import type { AccessCredential } from '../types/access-credential.js'
import type { InMemoryAccessToken } from '../types/in-memory-access-token.js'
import type { OAuthAccount } from '../types/oauth-account.js'
import type { OAuthConnectOptions } from '../types/oauth-connect-options.js'
import type { OAuthLoopbackListener } from '../types/oauth-loopback-listener.js'
import type { OAuthProviderConfiguration } from '../types/oauth-provider-configuration.js'
import type { OAuthProviderEnum } from '../types/oauth-provider-enum.js'
import type { OAuthPublicState } from '../types/oauth-public-state.js'
import type { OAuthServiceContract } from '../types/oauth-service-contract.js'
import type { OAuthServiceDependencies } from '../types/oauth-service-dependencies.js'
import type { OAuthTokenOperation } from '../types/oauth-token-operation.js'
import type { OAuthTokenResponse } from '../types/oauth-token-response.js'
import type { StoredOAuthCredential } from '../types/stored-oauth-credential.js'
import { createPkceChallenge } from '../utils/create-pkce-challenge.util.js'
import { createRandomBase64Url } from '../utils/create-random-base64-url.util.js'
import { getOAuthTokenDiagnosticCode } from '../utils/get-oauth-token-diagnostic-code.util.js'
import { getPublicOAuthErrorCode } from '../utils/get-public-oauth-error-code.util.js'
import { mapOAuthAccount } from '../utils/map-oauth-account.util.js'
import { parseOAuthIdToken } from '../utils/parse-oauth-id-token.util.js'
import { readOAuthProviderErrorCode } from '../utils/read-oauth-provider-error-code.util.js'
import { validateOAuthIdToken } from '../utils/validate-oauth-id-token.util.js'
import { verifyOAuthIdTokenSignature } from '../utils/verify-oauth-id-token-signature.util.js'

export class OAuthService implements OAuthServiceContract {
  private readonly credentialOperationIds = new Map<OAuthProviderEnum, symbol>()
  private readonly disconnectingProviders = new Set<OAuthProviderEnum>()
  private readonly accessTokens = new Map<
    OAuthProviderEnum,
    InMemoryAccessToken
  >()
  private readonly fetchImplementation
  private readonly now
  private activeAttemptId: symbol | null = null
  private activeListener: OAuthLoopbackListener | null = null
  private state: OAuthPublicState = {
    account: null,
    diagnosticCode: null,
    errorCode: null,
    provider: null,
    status: 'disconnected',
  }

  constructor(private readonly dependencies: OAuthServiceDependencies) {
    this.fetchImplementation = dependencies.fetchImplementation ?? fetch
    this.now = dependencies.now ?? Date.now
  }

  cancel(): OAuthPublicState {
    this.activeAttemptId = null
    this.activeListener?.cancel()
    this.activeListener = null
    this.setState({
      account: null,
      diagnosticCode: null,
      errorCode: 'oauth-cancelled',
      provider: this.state.provider,
      status: 'disconnected',
    })

    return this.getState()
  }

  connect(options: OAuthConnectOptions): Promise<OAuthPublicState> {
    return this.runConnect(options)
  }

  reconnect(options: OAuthConnectOptions): Promise<OAuthPublicState> {
    const storedCredential = this.dependencies.credentialStore.load(
      options.provider
    )

    return this.runConnect({
      expectedAccountId:
        options.expectedAccountId ?? storedCredential?.account.accountId,
      provider: options.provider,
    })
  }

  async disconnect(provider: OAuthProviderEnum): Promise<OAuthPublicState> {
    if (this.disconnectingProviders.has(provider)) {
      return this.getState()
    }

    this.disconnectingProviders.add(provider)
    this.invalidateCredentialOperations(provider)
    this.activeAttemptId = null
    this.activeListener?.cancel()
    this.activeListener = null
    this.accessTokens.delete(provider)
    this.setState({
      account: null,
      diagnosticCode: null,
      errorCode: null,
      provider: null,
      status: 'disconnected',
    })

    try {
      const storedCredential = this.dependencies.credentialStore.load(provider)

      if (storedCredential) {
        await this.revoke(provider, storedCredential.refreshToken)
      }
    } finally {
      try {
        this.invalidateCredentialOperations(provider)
        this.accessTokens.delete(provider)
        this.dependencies.credentialStore.delete(provider)
      } finally {
        this.disconnectingProviders.delete(provider)
      }
    }

    return this.getState()
  }

  dispose(): void {
    this.activeAttemptId = null
    this.activeListener?.cancel()
    this.activeListener = null
    this.accessTokens.clear()
    this.credentialOperationIds.clear()
    this.disconnectingProviders.clear()
  }

  async getAccessCredential(
    provider: OAuthProviderEnum
  ): Promise<AccessCredential> {
    if (this.disconnectingProviders.has(provider)) {
      throw new Error('oauth-reconnect-required')
    }

    const operationId = this.getCredentialOperationId(provider)
    const cachedToken = this.accessTokens.get(provider)

    if (
      cachedToken &&
      cachedToken.expiresAtMs - OAUTH_EXPIRY_SKEW_MS > this.now()
    ) {
      return this.mapAccessCredential(provider, cachedToken)
    }

    const storedCredential = this.dependencies.credentialStore.load(provider)

    if (!storedCredential) {
      throw new Error('oauth-reconnect-required')
    }

    try {
      const tokenResponse = await this.requestToken(
        this.getConfiguration(provider),
        new URLSearchParams({
          client_id: this.getConfiguration(provider).clientId,
          grant_type: 'refresh_token',
          refresh_token: storedCredential.refreshToken,
          scope: this.getConfiguration(provider).scopes.join(' '),
        }),
        'refresh-token'
      )

      if (
        this.disconnectingProviders.has(provider) ||
        !this.isCredentialOperationCurrent(provider, operationId)
      ) {
        throw new Error('oauth-operation-cancelled')
      }

      const accessToken = this.cacheAccessToken(provider, tokenResponse)

      if (
        tokenResponse.refresh_token &&
        tokenResponse.refresh_token !== storedCredential.refreshToken
      ) {
        this.dependencies.credentialStore.save(provider, {
          ...storedCredential,
          refreshToken: tokenResponse.refresh_token,
        })
      }

      return this.mapAccessCredential(provider, accessToken)
    } catch (error) {
      this.accessTokens.delete(provider)

      if (
        this.disconnectingProviders.has(provider) ||
        !this.isCredentialOperationCurrent(provider, operationId)
      ) {
        throw new Error('oauth-reconnect-required')
      }

      this.setState({
        account: storedCredential.account,
        diagnosticCode:
          error instanceof OAuthTokenRequestError ? error.diagnosticCode : null,
        errorCode: 'oauth-reconnect-required',
        provider,
        status: 'reconnect-required',
      })
      throw new Error('oauth-reconnect-required')
    }
  }

  getState(): OAuthPublicState {
    return {
      ...this.state,
      account: this.state.account ? { ...this.state.account } : null,
    }
  }

  private async runConnect(
    options: OAuthConnectOptions
  ): Promise<OAuthPublicState> {
    if (
      this.activeAttemptId ||
      this.disconnectingProviders.has(options.provider)
    ) {
      return this.getState()
    }

    const configuration = this.getConfiguration(options.provider)

    if (!configuration.clientId) {
      return this.failConnect(
        options.provider,
        new Error('oauth-configuration-missing')
      )
    }

    const attemptId = Symbol('oauth-connect-attempt')
    const state = createRandomBase64Url()
    const nonce = createRandomBase64Url()
    const verifier = createRandomBase64Url(64)
    let listener: OAuthLoopbackListener | null = null

    this.activeAttemptId = attemptId
    this.setState({
      account: null,
      diagnosticCode: null,
      errorCode: null,
      provider: options.provider,
      status: 'connecting',
    })

    try {
      listener = await this.dependencies.createLoopbackListener(
        options.provider,
        state,
        OAUTH_CALLBACK_TIMEOUT_MS
      )

      if (this.activeAttemptId !== attemptId) {
        listener.cancel()
        return this.getState()
      }

      this.activeListener = listener

      const authorizationUrl = this.createAuthorizationUrl(
        configuration,
        listener.redirectUri,
        state,
        nonce,
        verifier
      )

      await this.dependencies.openExternal(authorizationUrl)
      const callback = await listener.result
      const tokenResponse = await this.requestToken(
        configuration,
        new URLSearchParams({
          client_id: configuration.clientId,
          code: callback.code,
          code_verifier: verifier,
          grant_type: 'authorization_code',
          redirect_uri: listener.redirectUri,
        }),
        'authorization-code'
      )
      const account = await this.validateAccount(
        configuration,
        tokenResponse,
        nonce,
        options.expectedAccountId
      )

      if (!tokenResponse.refresh_token) {
        throw new OAuthTokenRequestError(
          'oauth-reconnect-required',
          'oauth-authorization-code-response-refresh-token-missing'
        )
      }

      const credential: StoredOAuthCredential = {
        account,
        refreshToken: tokenResponse.refresh_token,
      }

      if (this.activeAttemptId !== attemptId) {
        return this.getState()
      }

      this.dependencies.credentialStore.save(options.provider, credential)
      this.cacheAccessToken(options.provider, tokenResponse)
      this.setState({
        account,
        diagnosticCode: null,
        errorCode: null,
        provider: options.provider,
        status: 'connected',
      })
    } catch (error) {
      if (this.activeAttemptId === attemptId) {
        return this.failConnect(options.provider, error)
      }

      return this.getState()
    } finally {
      if (this.activeAttemptId === attemptId) {
        this.activeAttemptId = null
        this.activeListener = null
      }
    }

    return this.getState()
  }
  private createAuthorizationUrl(
    configuration: OAuthProviderConfiguration,
    redirectUri: string,
    state: string,
    nonce: string,
    verifier: string
  ): string {
    const url = new URL(configuration.authorizationEndpoint)
    url.search = new URLSearchParams({
      access_type: 'offline',
      client_id: configuration.clientId,
      code_challenge: createPkceChallenge(verifier),
      code_challenge_method: 'S256',
      nonce,
      prompt: 'consent',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: configuration.scopes.join(' '),
      state,
    }).toString()

    return url.toString()
  }

  private async validateAccount(
    configuration: OAuthProviderConfiguration,
    tokenResponse: OAuthTokenResponse,
    nonce: string,
    expectedAccountId?: string
  ): Promise<OAuthAccount> {
    if (!tokenResponse.id_token) {
      throw new Error('oauth-invalid-id-token')
    }

    await verifyOAuthIdTokenSignature(
      tokenResponse.id_token,
      configuration,
      this.fetchImplementation
    )

    const claims = parseOAuthIdToken(tokenResponse.id_token)
    validateOAuthIdToken(claims, configuration, nonce, this.now())

    const account = mapOAuthAccount(configuration.provider, claims)

    if (expectedAccountId && account.accountId !== expectedAccountId) {
      throw new Error('oauth-account-mismatch')
    }

    return account
  }

  private async requestToken(
    configuration: OAuthProviderConfiguration,
    body: URLSearchParams,
    operation: OAuthTokenOperation
  ): Promise<OAuthTokenResponse> {
    let response: Response

    try {
      response = await this.fetchImplementation(configuration.tokenEndpoint, {
        body,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        method: 'POST',
      })
    } catch {
      throw new OAuthTokenRequestError(
        'oauth-unavailable',
        `oauth-${operation}-exchange-network-error`
      )
    }

    if (!response.ok) {
      const providerError = await readOAuthProviderErrorCode(response)

      throw new OAuthTokenRequestError(
        'oauth-reconnect-required',
        getOAuthTokenDiagnosticCode(operation, providerError)
      )
    }

    let tokenResponse: unknown
    let invalidResponsePublicErrorCode:
      'oauth-reconnect-required' | 'oauth-unavailable' =
      'oauth-reconnect-required'

    if (operation === 'authorization-code') {
      invalidResponsePublicErrorCode = 'oauth-unavailable'
    }

    try {
      tokenResponse = await response.json()
    } catch {
      throw new OAuthTokenRequestError(
        invalidResponsePublicErrorCode,
        `oauth-${operation}-response-invalid-json`
      )
    }

    if (tokenResponse === null) {
      throw new OAuthTokenRequestError(
        invalidResponsePublicErrorCode,
        `oauth-${operation}-response-invalid-shape`
      )
    }

    const typedTokenResponse = tokenResponse as Partial<OAuthTokenResponse>

    if (
      !typedTokenResponse.access_token ||
      !typedTokenResponse.expires_in ||
      !typedTokenResponse.token_type
    ) {
      throw new OAuthTokenRequestError(
        'oauth-reconnect-required',
        `oauth-${operation}-response-invalid-shape`
      )
    }

    return typedTokenResponse as OAuthTokenResponse
  }

  private getCredentialOperationId(provider: OAuthProviderEnum): symbol {
    const existingOperationId = this.credentialOperationIds.get(provider)

    if (existingOperationId) {
      return existingOperationId
    }

    return this.invalidateCredentialOperations(provider)
  }

  private invalidateCredentialOperations(provider: OAuthProviderEnum): symbol {
    const operationId = Symbol('oauth-credential-operation')

    this.credentialOperationIds.set(provider, operationId)

    return operationId
  }

  private isCredentialOperationCurrent(
    provider: OAuthProviderEnum,
    operationId: symbol
  ): boolean {
    return this.credentialOperationIds.get(provider) === operationId
  }

  private cacheAccessToken(
    provider: OAuthProviderEnum,
    tokenResponse: OAuthTokenResponse
  ): InMemoryAccessToken {
    const token = {
      accessToken: tokenResponse.access_token,
      expiresAtMs: this.now() + tokenResponse.expires_in * 1000,
    }

    this.accessTokens.set(provider, token)

    return token
  }

  private mapAccessCredential(
    provider: OAuthProviderEnum,
    token: InMemoryAccessToken
  ): AccessCredential {
    return {
      accessToken: token.accessToken,
      expiresAt: new Date(token.expiresAtMs).toISOString(),
      provider,
    }
  }

  private async revoke(
    provider: OAuthProviderEnum,
    refreshToken: string
  ): Promise<void> {
    const configuration = this.getConfiguration(provider)

    if (!configuration.revocationEndpoint) {
      return
    }

    try {
      await this.fetchImplementation(configuration.revocationEndpoint, {
        body: new URLSearchParams({ token: refreshToken }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        method: 'POST',
      })
    } catch {
      // Local credential removal is authoritative even if provider revocation is unavailable.
    }
  }

  private getConfiguration(
    provider: OAuthProviderEnum
  ): OAuthProviderConfiguration {
    const configuration = this.dependencies.configurations.get(provider)

    if (!configuration) {
      throw new Error('oauth-configuration-missing')
    }

    return configuration
  }

  private failConnect(
    provider: OAuthProviderEnum,
    error: unknown
  ): OAuthPublicState {
    const errorCode = getPublicOAuthErrorCode(error)
    const diagnosticCode =
      error instanceof OAuthTokenRequestError ? error.diagnosticCode : null

    this.setState({
      account: null,
      diagnosticCode,
      errorCode,
      provider,
      status:
        errorCode === 'oauth-reconnect-required'
          ? 'reconnect-required'
          : 'disconnected',
    })

    return this.getState()
  }

  private setState(state: OAuthPublicState): void {
    this.state = state
    this.dependencies.onStateChange?.(this.getState())
  }
}
