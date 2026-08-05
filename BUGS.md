# NoteStack Bugs

## Status Legend

- `[ ]` Not started
- `[~]` In progress
- `[x]` Done
- `[!]` Blocked or needs decision

- [x] B100. Add missing translation for mergeDateTimeFields field
- [x] B101. GitHub workflow "Sign installer with Certum SimplySign" is failing
- [x] B102. GitHub workflow "Sign installer with Certum SimplySign" is failing at jsign --verify
- [x] B103. GitHub workflow "Sign installer with Certum SimplySign" is failing at "osslsigncode is required to verify signed Windows artifacts"
- [x] B104. Fix mojibake in Windows publisher metadata
- [x] B105. GitHub workflow is failing at "Build unsigned Electron app directory"
- [x] B106. Checking for updates on the NoteStack's Settings page results in `ENOENT: no such file or directory, open 'C:\Users\vojta\AppData\Local\Programs\NoteStack\resources\app-update.yml'`
- [x] B107. Windows auto-update rejects Certum-signed update when publisher metadata differs by diacritics
- [x] B108. Packaged app fails after restart with `The local backend exited before it became ready` because backend dependencies were omitted and packaged runtime dependencies were incompatible
- [x] B109. Fix sandboxed preload failure bypassing the startup gate
- [x] B110. Packaged app reports "Automatic updates are unavailable in this environment." after startup preload changes
- [x] B111. Fix notes toolbar sticky offset below the window title bar
- [x] B112. Start the local backend on an available port and connect the frontend to it
- [x] B113. Import Excel in-cell images from duplicate XLSX image columns
- [x] B114. Fix uneven masonry columns leaving a large vertical gap
- [x] B115. Fix Google Desktop OAuth loopback redirect URI
  - Use Google's documented bare ephemeral loopback URI while preserving OneDrive's provider-specific callback path.
  - Keep authorization and token-exchange redirect URIs identical without weakening callback state, host, method, timeout, or single-use validation.
  - Follow the utility placement, naming, test, and formatting rules in AGENTS.md.
- [x] B116. Classify sanitized OAuth invalid-request details
  - Refine generic invalid-request diagnostics with exact, allowlisted missing or malformed request-field classifications.
  - Keep raw provider descriptions, request values, credentials, and client configuration out of public state, logs, persistence, and UI.
  - Preserve NoteStack's public-client behavior while following the type, utility, naming, test, and formatting rules in AGENTS.md.
- [x] B117. Send the Google OAuth client secret during token exchange
  - Embed the configured Google Desktop OAuth client secret for development and packaged builds without exposing its value in diagnostics or logs.
  - Include the secret only in Google authorization-code and refresh-token POST bodies while preserving PKCE and Microsoft public-client behavior.
  - Follow the utility placement, naming, test, security, and formatting rules in AGENTS.md.
