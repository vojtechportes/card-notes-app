# OAuth application registration

NoteStack uses native/public OAuth applications and the system browser. It never ships a desktop client secret.

Electron launch and packaging commands require these public client IDs. The Electron build embeds them into the packaged main-process code:

- `NOTESTACK_GOOGLE_OAUTH_CLIENT_ID`
- `NOTESTACK_MICROSOFT_OAUTH_CLIENT_ID`

Register loopback redirects (`http://127.0.0.1:{ephemeral-port}/oauth/callback/google-drive` and `http://127.0.0.1:{ephemeral-port}/oauth/callback/one-drive`) for development and packaged Windows builds. Google must allow the `drive.appdata` scope. Microsoft must allow delegated `Files.ReadWrite.AppFolder`, `offline_access`, `openid`, `profile`, and `email`; do not grant broad drive-read scopes.

The application reports `oauth-configuration-missing` when the selected provider has no registered client ID. Users are never asked to enter client IDs, secrets, tokens, or redirect URLs.

For local development, export both client IDs in the PowerShell session before starting Electron:

```powershell
$env:NOTESTACK_GOOGLE_OAUTH_CLIENT_ID = "<google-client-id>"
$env:NOTESTACK_MICROSOFT_OAUTH_CLIENT_ID = "<microsoft-client-id>"
npm run dev:electron
```

If the GitHub CLI is authenticated for the repository, the public IDs can be read from repository variables without copying them into source files:

```powershell
$env:NOTESTACK_GOOGLE_OAUTH_CLIENT_ID = (gh variable get NOTESTACK_GOOGLE_OAUTH_CLIENT_ID).Trim()
$env:NOTESTACK_MICROSOFT_OAUTH_CLIENT_ID = (gh variable get NOTESTACK_MICROSOFT_OAUTH_CLIENT_ID).Trim()
```

GitHub Actions repository variables are not automatically exposed to workflow processes. The release workflow maps both variables into only the Windows app-directory build job. Client IDs are public identifiers, but the workflow and build scripts never print their values.

The generic workspace build remains available without OAuth configuration. Electron development, directory packaging, and installer packaging verify that both identities were embedded before launching Electron or electron-builder.

Packaged OAuth verification removes both build-time environment variables before launching the built executable. This proves the installed application uses its bundled identities while exercising signed provider identity validation, loopback callbacks, PKCE exchange, OS secure storage, and the authenticated broker for both providers.
