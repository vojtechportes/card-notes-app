# OAuth application registration

NoteStack uses the system browser, PKCE, state, and nonce for native OAuth. Microsoft remains a public client and has no client secret. Google Desktop registration requires the issued client secret during token exchange for the configured client.

Electron launch and packaging commands require these values. The Electron build embeds all three into packaged main-process code:

- `NOTESTACK_GOOGLE_OAUTH_CLIENT_ID`
- `NOTESTACK_GOOGLE_OAUTH_CLIENT_SECRET`
- `NOTESTACK_MICROSOFT_OAUTH_CLIENT_ID`

A Google Desktop client secret embedded in a distributed desktop application is extractable and must not be treated as proof of app identity or as a security boundary. Store it as a GitHub Actions repository secret to keep it out of source, workflow logs, and routine repository configuration. PKCE, state, and nonce remain mandatory. NoteStack does not copy this value into runtime logs, UI, diagnostic state, or credential storage, and sends it only to Google's token endpoint.

Google Desktop OAuth uses the provider-supported bare loopback redirect `http://127.0.0.1:{ephemeral-port}`; the ephemeral port is selected at runtime and is not registered individually in Google Cloud Console. Microsoft retains the provider-specific loopback redirect `http://127.0.0.1:{ephemeral-port}/oauth/callback/one-drive` for development and packaged Windows builds. Google must allow the `drive.appdata` scope. Microsoft must allow delegated `Files.ReadWrite.AppFolder`, `offline_access`, `openid`, `profile`, and `email`; do not grant broad drive-read scopes.

The application reports `oauth-configuration-missing` when the selected provider has no registered client ID. Build verification rejects a missing Google client secret before Electron launches or packaging starts. Users are never asked to enter client IDs, secrets, tokens, or redirect URLs.

For local development, inject all three values into the PowerShell process before starting Electron. Prefer a password manager or another local secret-injection mechanism for the Google client secret:

```powershell
$env:NOTESTACK_GOOGLE_OAUTH_CLIENT_ID = "<google-client-id>"
$env:NOTESTACK_GOOGLE_OAUTH_CLIENT_SECRET = "<google-client-secret>"
$env:NOTESTACK_MICROSOFT_OAUTH_CLIENT_ID = "<microsoft-client-id>"
npm run dev:electron
```

If the GitHub CLI is authenticated for the repository, the public IDs can be read from repository variables. GitHub does not allow retrieving a repository secret after it is stored, so inject the Google credential separately from your password manager or local secret store:

```powershell
$env:NOTESTACK_GOOGLE_OAUTH_CLIENT_ID = (gh variable get NOTESTACK_GOOGLE_OAUTH_CLIENT_ID).Trim()
$env:NOTESTACK_GOOGLE_OAUTH_CLIENT_SECRET = "<injected-by-your-local-secret-store>"
$env:NOTESTACK_MICROSOFT_OAUTH_CLIENT_ID = (gh variable get NOTESTACK_MICROSOFT_OAUTH_CLIENT_ID).Trim()
```

GitHub Actions repository configuration is not automatically exposed to workflow processes. The release workflow maps both public ID variables and the Google secret into only the Windows app-directory build job. Build scripts and validation errors name only the missing setting and never print configured values.

The generic workspace build remains available without OAuth configuration. Electron development, directory packaging, and installer packaging verify that both IDs and the Google credential were embedded before launching Electron or electron-builder.

Packaged OAuth verification removes all three build-time environment variables before launching the built executable. This proves the installed application uses its bundled configuration while exercising signed provider identity validation, loopback callbacks, PKCE exchange, provider-specific token parameters, OS secure storage, and the authenticated broker for both providers.
