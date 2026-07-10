# Card Notes App

Local-first Electron card notes application with a NestJS backend and React/Vite frontend.

## Install

- `npm install` installs all workspace dependencies.

## Local Development

Run the app in three terminals:

1. `npm run dev:backend`
2. `npm run dev:frontend`
3. `npm run dev:electron`

The backend health endpoint is available at `/api/health`, and Swagger is exposed at `/api/docs`.

## Build and Package

- `npm run build` builds the backend, frontend, and Electron shell.
- `npm run package:dir` creates an unpacked Windows Electron build in `electron/release/win-unpacked`.
- `npm run package` builds the full app and creates a Windows installer executable in `electron/release` without publishing release assets.
- `npm run package:release` builds the full app and creates the Windows installer plus updater artifacts for the GitHub release workflow.
- `npm run verify:release-artifacts --workspace electron` verifies that the packaged Windows updater artifacts include the installer, `latest.yml`, and the installer blockmap.
- Electron packaging stages the backend production runtime into `electron/.backend-runtime` before building the installer.

## GitHub Release Automation

Publishing a GitHub release triggers `.github/workflows/release-electron.yml`, which installs dependencies, restores the Windows code-signing certificate from secrets, verifies the signing and publishing environment, builds the full application, packages the Electron installer, uploads the installer plus updater metadata to the already published GitHub release for `vojtechportes/card-notes-app`, verifies the local release directory still contains the updater artifacts expected by `electron-updater`, and confirms that the published GitHub release includes the installer, `latest.yml`, and the installer blockmap.

Required GitHub Actions credentials:

- `WINDOWS_CERT_BASE64`: base64-encoded `.pfx` certificate used for Windows signing.
- `WINDOWS_CERT_PASSWORD`: password for the signing certificate.
- `GITHUB_TOKEN`: provided by GitHub Actions and used by the workflow as `GH_TOKEN` when uploading release assets.

Release process:

1. Update the application version as needed.
2. Create the Git tag and corresponding GitHub release.
3. Publish the GitHub release to trigger the workflow.
4. Wait for the workflow to finish uploading the Windows installer and updater metadata.
5. Confirm the release assets include `card-notes-app-<version>-setup.exe`, `card-notes-app-<version>-setup.exe.blockmap`, and `latest.yml`.
6. Install the uploaded build on one machine, then use the in-app updater on an older installed build to confirm update discovery and download behavior.

Self-signed release note:

- The generated installer is signed for integrity, and the auto-update flow downloads that same signed installer, but Windows and SmartScreen will still treat it as self-signed and may show trust warnings.
- For trusted public production releases, replace the self-signed workflow step with a CA-issued code-signing certificate.
- Until a CA-issued certificate is used, treat updater verification as a functional test rather than proof of SmartScreen reputation or end-user trust.
