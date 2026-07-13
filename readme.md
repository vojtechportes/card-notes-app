# NoteStack

Local-first Electron structured notes application with a NestJS backend and React/Vite frontend.

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
- `npm run package:release` builds the full app and creates unsigned Windows installer plus updater artifacts for the GitHub release workflow.
- `npm run verify:release-artifacts --workspace electron` verifies that the packaged Windows updater artifacts include the installer, `latest.yml`, and the installer blockmap.
- `npm run refresh:signed-release-artifacts --workspace electron` regenerates the installer blockmap and `latest.yml` hash/size after the installer has been signed in CI.
- Electron packaging stages the backend production runtime into `electron/.backend-runtime` before building the installer.

## GitHub Release Automation

Publishing a GitHub release triggers `.github/workflows/release-electron.yml`. The workflow builds unsigned Windows Electron artifacts on Windows, uploads them as a workflow artifact, signs the NSIS installer in a dedicated Certum SimplySign job, refreshes the updater metadata for the signed installer bytes, uploads the signed installer plus updater metadata to the GitHub release for `vojtechportes/card-notes-app`, and verifies that the published release includes the installer, `latest.yml`, and the installer blockmap.

Required GitHub Actions credentials:

- `CERTUM_USER_ID`: Certum SimplySign login id.
- `CERTUM_OTP_URI`: full `otpauth://` URI used to generate the SimplySign TOTP code.
- `CERTUM_CERT_FINGERPRINT`: SHA-256 fingerprint of the Certum cloud code-signing certificate, without relying on a local private key. For the current local `.cer` file this is `A5A3ECF7F164A9E0D7997C33404D08601DD509F5D903DFEBCD59CF6EDE33593B`.
- `GITHUB_TOKEN`: provided by GitHub Actions and used by the workflow as `GH_TOKEN` when uploading release assets.

Signer image requirement:

- The signing job currently runs in `ghcr.io/reactiveui/certum-signer:latest`, following the referenced ReactiveUI Certum flow. That image must be accessible to this repository and must expose `SS_DIST` for SimplySign Desktop, `JSIGN_JAR` for jsign, and `osslsigncode` for signature verification.
- If that image is not accessible, publish a repo-owned signer image with SimplySign Desktop, jsign, OpenJDK, Xvfb, fluxbox, xdotool, OpenSC, OpenSSL, osslsigncode, Python 3, and the `SS_DIST` / `JSIGN_JAR` environment variables, then update the workflow container image.

Certificate files:

- The local `.cer` or `.pem` certificate files are not uploaded to GitHub and are not used as signing keys. Use one of them to confirm the public certificate fingerprint for `CERTUM_CERT_FINGERPRINT` and the publisher subject used by `electron-updater` for Windows updater verification.
- The private signing key stays in Certum SimplySign cloud storage and is accessed through the SimplySign Desktop PKCS#11 token during CI. The current updater publisher name is configured from the certificate simple name as `Open Source Developer Vojtěch Porteš`; update `electron/scripts/write-app-update-publisher.mjs` if Certum reissues the certificate with a different subject.

Release process:

1. Ensure the Certum identity verification is complete and the cloud code-signing certificate is issued.
2. Confirm the signer image is accessible from GitHub Actions.
3. Add or update the required GitHub repository secrets.
4. Update the application version as needed.
5. Create the Git tag and corresponding GitHub release.
6. Publish the GitHub release to trigger the workflow.
7. Wait for the workflow to build unsigned artifacts, sign the installer, refresh updater metadata, and upload release assets.
8. Confirm the release assets include `notestack-<version>-setup.exe`, `notestack-<version>-setup.exe.blockmap`, and `latest.yml`.
9. Install the uploaded build on one machine, then use the in-app updater on an older installed build to confirm update discovery and download behavior.

Known signing limitations:

- The final NSIS installer is signed after packaging. Because signing changes the installer bytes, CI refreshes `latest.yml` and the blockmap before upload.
- The inner `win-unpacked` application executables are not signed while `CSC_IDENTITY_AUTO_DISCOVERY=false`; T59 tracks adding a pre-installer inner executable signing stage.
- SimplySign Desktop has no stable headless API. The CI action drives the GUI through Xvfb and xdotool, so release signing can be sensitive to UI timing, token state, TOTP clock drift, and signer image updates.
- A newly issued certificate may still need reputation history before Windows SmartScreen warnings disappear.
