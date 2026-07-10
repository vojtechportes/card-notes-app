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
- `npm run package:release` builds the full app, creates the Windows installer, and publishes updater artifacts to the configured GitHub release.
- Electron packaging stages the backend production runtime into `electron/.backend-runtime` before building the installer.

## GitHub Release Automation

Publishing a GitHub release triggers `.github/workflows/release-electron.yml`, which installs dependencies, builds the full application, stages the backend production runtime, restores the Windows code-signing certificate from secrets, signs the release, packages the Electron installer, and publishes the installer plus updater metadata to the GitHub release for `vojtechportes/card-notes-app`.

Self-signed release note:

- The generated installer is signed for integrity, but Windows and SmartScreen will still treat it as self-signed and may show trust warnings.
- For trusted public production releases, replace the self-signed workflow step with a CA-issued code-signing certificate.
