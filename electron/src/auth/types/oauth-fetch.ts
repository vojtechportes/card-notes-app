export type OAuthFetch = (
  input: string | URL,
  init?: RequestInit
) => Promise<Response>
