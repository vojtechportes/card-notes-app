# OAuth application registration

NoteStack uses native/public OAuth applications and the system browser. It never ships a desktop client secret.

Release builds must provide these public client IDs while running the Electron build. The build embeds them into the packaged main-process code:

- `NOTESTACK_GOOGLE_OAUTH_CLIENT_ID`
- `NOTESTACK_MICROSOFT_OAUTH_CLIENT_ID`

Register loopback redirects (`http://127.0.0.1:{ephemeral-port}/oauth/callback/google-drive` and `http://127.0.0.1:{ephemeral-port}/oauth/callback/one-drive`) for development and packaged Windows builds. Google must allow the `drive.appdata` scope. Microsoft must allow delegated `Files.ReadWrite.AppFolder`, `offline_access`, `openid`, `profile`, and `email`; do not grant broad drive-read scopes.

The application reports `oauth-configuration-missing` when the selected provider has no registered client ID. Users are never asked to enter client IDs, secrets, tokens, or redirect URLs.

package:release verifies that both identities were embedded before creating release artifacts. Development builds may read the same environment variables at runtime.

package:dir and packaged installer flows launch the built Electron executable in a non-interactive verification mode that exercises signed provider identity validation, loopback callbacks, PKCE exchange, OS secure storage, and the authenticated broker for both providers.
