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
- `npm run package` builds the full app and creates a Windows installer executable in `electron/release`.

## GitHub Release Automation

Publishing a GitHub release triggers `.github/workflows/release-electron.yml`, which installs dependencies, builds the full application, packages the Windows Electron installer, and uploads the generated `.exe` asset to the release.
