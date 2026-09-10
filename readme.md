# NoteStack

Local-first Electron structured notes application with a NestJS backend and React/Vite frontend.

## Install

- `npm install` installs all workspace dependencies.

## Local Development

Run the desktop app in three terminals:

1. `npm run dev:backend`
2. `npm run dev:frontend`
3. `npm run dev:electron`

The backend health endpoint is available at `/api/health`, and Swagger is exposed at `/api/docs`. The separately deployable content-free relay can be run with `npm run dev:notification-service`; its protocol and deployment runbook live in `notification-service/README.md`.

Before running `npm run dev:electron`, export the public Google and Microsoft OAuth client IDs plus the Google Desktop OAuth client secret in that PowerShell session. See `electron/OAUTH.md` for provider registration, secure local injection, and packaging details. Microsoft remains a public client without a secret.

## Build and Package

- `npm run build` builds the backend, frontend, Electron shell, and notification service.
- `npm run deploy:check:notification-service` validates the Cloudflare relay bundle without publishing it.
- `npm run package`, `npm run package:release`, and `npm run package:dir` remain backwards-compatible Windows x64 aliases.
- `npm run package:windows`, `npm run package:windows:release`, and `npm run package:windows:dir` are the explicit Windows x64 commands.
- `npm run package:mac:x64` and `npm run package:mac:arm64` create architecture-specific macOS DMG and ZIP artifacts.
- `npm run package:mac:dir:x64` and `npm run package:mac:dir:arm64` create unpacked architecture-specific Mac application bundles.
- `npm run verify:release-artifacts:windows --workspace electron` validates `latest.yml`, the NSIS installer, its blockmap, size, and hash.
- `npm run verify:release-artifacts:mac --workspace electron` validates the merged `latest-mac.yml`, both ZIP hashes/sizes, and both DMGs.

Electron packaging stages the backend production dependency closure into `electron/.backend-runtime` and rebuilds `better-sqlite3` for the Electron target architecture. Each Mac architecture must be staged and built in its own clean job; `.backend-runtime` and packaged directories must never be shared between architectures or with Windows.

The Mac commands can make unsigned local artifacts without release credentials. Those artifacts are development checks only: they must not be uploaded as public releases and do not satisfy Gatekeeper distribution requirements.

## Supported desktop releases

The stable desktop release supports:

- Windows x64 through the existing NSIS installer.
- macOS 11.0 or newer on Intel (`x64`) and Apple Silicon (`arm64`).

Mac architectures are built independently. The release contains one DMG and ZIP per architecture and one merged `latest-mac.yml`. The literal `arm64` marker in the Apple Silicon ZIP name is required by the pinned `electron-updater` 6.8.9 `MacUpdater`; Intel uses the x64 ZIP fallback. Application identity remains `com.cardnotes.app`, product name remains `NoteStack`, updates remain in `vojtechportes/card-notes-app`, and persisted data remains under the `card-notes-app` child directory of Electron `appData` (`~/Library/Application Support` on macOS).

## GitHub release automation

Publishing a GitHub release triggers `.github/workflows/release-electron.yml` from one version-update commit. Windows and the two Mac architectures are prepared independently. No platform is uploaded publicly until all jobs have completed signing, notarization, runtime verification, and artifact validation.

The Windows path remains unchanged: build an x64 app directory, sign nested executables through Certum SimplySign, create and sign the NSIS installer, refresh the signed bytes in `latest.yml` and its blockmap, and validate the complete set.

The Mac matrix uses `macos-15-intel` for x64 and `macos-15` for arm64. Each job rebuilds `better-sqlite3`, signs the complete `.app` with a Developer ID Application identity and hardened runtime, notarizes the app with an App Store Connect API key, creates architecture-safe DMG/ZIP artifacts, separately notarizes and staples the DMG, and verifies:

- the app and native SQLite Mach-O architecture;
- the packaged backend dependency closure and health endpoint;
- two concurrent isolated packaged OAuth runs;
- deep/strict code signing, Gatekeeper assessment, and app/DMG stapling;
- DMG mount/copy installation and ZIP application payload integrity.

The final job merges the two updater manifests, validates Windows and macOS artifacts together, removes/replaces only the exact expected asset names for the release version, uploads them, and queries GitHub to prove every expected asset exists exactly once. If upload or post-upload verification fails, it removes only that exact expected set so a rerun has a deterministic recovery path. GitHub uploads are not transactional, so a release must not be announced as available until this final job succeeds.

Expected public assets for version `<version>` are:

- `latest.yml`
- `notestack-<version>-setup.exe`
- `notestack-<version>-setup.exe.blockmap`
- `latest-mac.yml`
- `notestack-<version>-x64.dmg`
- `notestack-<version>-x64.zip`
- `notestack-<version>-arm64.dmg`
- `notestack-<version>-arm64.zip`

## Release credentials

Required GitHub Actions repository variables:

- `NOTESTACK_GOOGLE_OAUTH_CLIENT_ID`: public Google Desktop OAuth client ID.
- `NOTESTACK_MICROSOFT_OAUTH_CLIENT_ID`: public Microsoft native/public application client ID.

Required shared application secret:

- `NOTESTACK_GOOGLE_OAUTH_CLIENT_SECRET`: Google Desktop OAuth client secret. The packaged value is extractable and is not an application-identity security boundary.

Required Windows signing secrets:

- `CERTUM_USER_ID`
- `CERTUM_OTP_URI`
- `CERTUM_CERT_FINGERPRINT`

Required Mac signing/notarization secrets:

- `MACOS_CERTIFICATE_BASE64`: base64-encoded Developer ID Application `.p12` certificate and private key.
- `MACOS_CERTIFICATE_PASSWORD`: password for that `.p12`.
- `APPLE_API_KEY_BASE64`: base64-encoded App Store Connect `.p8` API key.
- `APPLE_API_KEY_ID`: App Store Connect API key ID.
- `APPLE_API_ISSUER`: App Store Connect issuer ID.

`GITHUB_TOKEN` is supplied by Actions for artifact publishing. Apple credentials are scoped to the Mac build job, materialized only below `RUNNER_TEMP`, permission-restricted, and never printed. Do not place certificate or API-key contents in repository files, logs, release artifacts, or support bundles.

The Windows signing job uses `ghcr.io/reactiveui/certum-signer:latest`. It must expose `SS_DIST`, `JSIGN_JAR`, and `osslsigncode`. The Certum publisher name in `electron/scripts/write-app-update-publisher.mjs` remains Windows-only; macOS updater verification relies on the signed application update path.

## Release process and acceptance rehearsal

1. Configure the OAuth, Certum, Developer ID Application, and App Store Connect credentials.
2. Run `npm test`, `npm run lint`, `npm run build`, and the available local platform packaging checks.
3. Create two private/draft fixture releases: an older signed/notarized version and a newer candidate. Retain them until both update rehearsals pass, then delete their assets and tags explicitly.
4. On clean standard-user Intel and Apple Silicon Macs, install the older DMG without a Gatekeeper bypass. Verify first launch, quit/reopen, Dock reactivation, native traffic-light controls, note CRUD, images, import/export, persistence, OAuth, sync startup, and external links.
5. Update in-app to the newer version and repeat the checks. Confirm `latest-mac.yml` selects the x64 ZIP on Intel and the `arm64` ZIP on Apple Silicon.
6. Run `codesign --verify --deep --strict`, `spctl --assess`, `xcrun stapler validate`, and notarization-history/status checks against the candidate artifacts.
7. Repeat the existing Windows clean install and older-to-newer update smoke test.
8. Publish the real release, wait for `publish-electron-release` to succeed, and verify the eight exact assets above before announcing availability.

Record the workflow run URL, release URL, x64/arm64 machine and OS versions, notarization submission IDs, clean-install results, update rehearsal versions, Windows regression result, tester, and date in the release notes. TMSC-42 is not operationally complete until this evidence exists.

## Troubleshooting

- Missing-secret failures name only the absent variable. Confirm repository secrets are configured; never echo their values.
- A signing identity error usually means the `.p12` is not a Developer ID Application identity, its password is wrong, or the certificate has expired.
- A notarization failure should be investigated with the submission ID and `xcrun notarytool log`; inspect diagnostics for unsigned nested binaries or rejected entitlements without posting credentials.
- A wrong-architecture SQLite error means `.backend-runtime` was reused or `npm_config_arch` did not match the runner. Delete the staged runtime, rebuild on the matching runner, and confirm with `lipo -archs`.
- If the wrong Mac update is chosen, confirm the merged manifest has exactly two ZIP entries and that only the Apple Silicon filename contains the literal `arm64` marker.
- If publishing fails, rerun the workflow after correcting the cause. The publisher removes only the exact expected version asset set; do not broadly delete release assets.
- SimplySign Desktop has no stable headless API. Windows signing can remain sensitive to UI timing, token state, TOTP clock drift, and signer-image updates.
- Newly issued Windows certificates can require reputation history before SmartScreen warnings disappear.
