# NoteStack Tasks

This backlog is derived from `AGENTS.md`. Keep tasks incremental and update statuses as work lands.

## Status Legend

- `[ ]` Not started
- `[~]` In progress
- `[x]` Done
- `[!]` Blocked or needs decision

## Phase 0: Project Foundation

- [x] T00. Confirm repository baseline
  - Read `AGENTS.md` before implementation.
  - Preserve existing frontend masonry files.
  - Top-level `types/`, `utils/`, and `constants` folders are allowed only for artifacts genuinely shared across backend and frontend, such as generated API types or cross-app contracts.

- [x] T01. Create workspace package structure
  - Add root package scripts for local development and build orchestration.
  - Keep backend and frontend package.json files separate when possible.
  - Add Electron package/app shell in a location that can bundle the frontend and start/connect to the backend.

- [x] T02. Configure TypeScript and tooling
  - Add strict TypeScript config for backend, frontend, and Electron where needed.
  - Add lint/test/build scripts.
  - Ensure all files and folders use kebab-case.
  - Keep backend/frontend-local types, utils, and constants near their owning slice; use top-level shared folders only for true cross-app code.

## Phase 1: Backend Foundation

- [x] T10. Scaffold NestJS backend
  - Create NestJS app structure under `backend`.
  - Expose Swagger as the frontend API source of truth.
  - Add health endpoint for local verification.

- [x] T11. Add SQLite persistence layer
  - Store data in a local SQLite database suitable for a single-user Electron app.
  - Keep database helpers inside the owning backend module/slice.
  - Add migration or initialization flow for required tables.

- [x] T12. Model columns/settings domain
  - Add `ColumnTypeEnum` with text, date, number, image, and link values.
  - Column base shape must include `id`, unique `name`, `title`, and `type`.
  - Include ordering, hidden state, and non-removable default columns for `createdAt` and `updatedAt`.
  - Use `uuid/v4` for generated IDs.

- [x] T13. Model notes domain
  - Notes must support structured values keyed by configured columns.
  - Notes must track `createdAt` and `updatedAt`.
  - Preserve note data when columns are removed unless the user explicitly chooses to delete associated data.
  - Support image data inserted from the frontend drag-and-drop workflow.

- [x] T14. Backend notes API
  - Create, list, update, and delete notes.
  - Delete note requires frontend confirmation before calling the endpoint.
  - Support sorting by `createdAt` and `updatedAt` in ASC/DESC order.
  - Provide enough data for frontend MiniSearch indexing/search.

- [x] T15. Backend settings/columns API
  - Create, list, update, reorder, hide, and delete columns.
  - Column delete must support two modes: remove definition only, or remove definition plus associated note data.
  - Persist general settings for optional truncation length and optional card field display count.

- [x] T16. Backend export/import API
  - Export all notes/settings/columns data as JSON.
  - Import the same JSON format without deleting existing notes.
  - Add validation for import payloads.

- [x] T17. Backend danger-zone API
  - Delete all notes endpoint.
  - Keep destructive operation semantics explicit for frontend confirmation.

## Phase 2: Frontend Foundation

- [x] T20. Scaffold React/Vite frontend around existing masonry component
  - Add `frontend/src/app.tsx`, `main.tsx`, `theme.ts`, and `i18n.ts`.
  - Configure MUI theme exactly as specified in `AGENTS.md`.
  - Configure i18next/react-i18next and keep all copy in JSON locale files.

- [x] T21. Add frontend dependencies and providers
  - Add Axios client.
  - Add TanStack Query provider.
  - Add react-hook-form and yup setup patterns.
  - Add date-fns formatting utilities only where needed.

- [x] T22. Add generated API types workflow
  - Add script similar to `k8s-frontend/scripts` for Swagger type generation.
  - Generate types into `frontend/src/types/api`.
  - Treat backend Swagger as source of truth.

- [x] T23. Add frontend routing/layout
  - Add two pages: Notes home page and Settings page.
  - Provide navigation that feels like an app shell, not a marketing page.

- [x] T24. Add shared confirmation service/modal
  - Copy or adapt confirmation service/modal pattern from `C:\Users\vojta\Documents\work\k8s-frontend`.
  - Use it for deleting notes, deleting all notes, and column deletion choices.

## Phase 3: Notes Experience

- [x] T30. Build notes query hooks/API layer
  - Fetch notes, create note, update note, delete note.
  - Invalidate/update TanStack Query caches after mutations.

- [x] T31. Build MiniSearch integration
  - Index searchable note values across all columns.
  - Keep search client-side over fetched note data.
  - Make search work with text, date, number, image metadata, and link display values where applicable.

- [x] T32. Build notes toolbar
  - Search bar above notes.
  - Sort button/control for `createdAt` and `updatedAt`, ASC/DESC.
  - Add note action opening the note modal.

- [x] T33. Build notes masonry card list
  - Render notes as MUI cards inside the existing masonry component.
  - Respect optional truncation setting.
  - Respect optional card field display count.
  - Render link columns as links that open in a new tab/window.
  - Render image columns appropriately.

- [x] T34. Build note create/edit modal
  - Use react-hook-form and yup.
  - Generate form fields from active column definitions.
  - Support drag-and-drop image insertion.
  - Localize all labels, validation, and actions.

- [x] T35. Build card delete flow
  - Each card has a delete action.
  - Deletion must use confirmation modal before API call.

- [x] T36. Build right-side note detail panel
  - Opening a card detail shows a right-side panel similar to `k8s-frontend`.
  - Include edit and delete actions in the detail context.

## Phase 4: Settings Experience

- [x] T40. Build settings query hooks/API layer
  - Fetch/update columns and general settings.
  - Import/export data.
  - Delete all notes.

- [x] T41. Build Columns section
  - Add, edit, reorder, hide, and delete columns.
  - Support column types: text, date, number, image, link.
  - Prevent removal of default `createdAt` and `updatedAt` columns.
  - Enforce unique column `name`.

  - [x] T42. Build column deletion confirmation choice
    - Ask whether to remove only the column definition or also delete associated note data.
    - Make the two choices clear and localized.

- [x] T43. Build General section
  - Optional text truncation character count.
  - Optional number of fields displayed on cards.

- [x] T44. Build Export / Import section
  - Export all data as JSON.
  - Import JSON without deleting existing notes.
  - Show validation/success/error states.

- [x] T45. Build Danger Zone section
  - Delete all notes button.
  - Require confirmation before deleting.

- [x] T46. Add prettier
  - Add prettier to both backend and frontend folders and format all code to match prettier configuration

- [x] T47. Add configuration option to merge date fields into one
  - Add mergeDateTimeField property co configuration service on backend
  - Generate new API types
  - Add mergeDateTimeField to frontend
  - Reflect state of mergeDateTifleFields in CardNote

- [x] T48. Add support for XLSX imports
- Allow xlsx imports
- Map row names in first column in xlsx to column names
- Extract images in xlsx and map them to correct column
- Integrate import on frontend

## Phase 5: Electron Integration

- [x] T50. Wire Electron main process
  - Launch frontend window.
  - Start/connect to local backend.
  - Keep the app single-user and local-first.

- [x] T51. Handle external links and files safely
  - Open link columns in the system browser/new tab behavior appropriate for Electron.
  - Keep image handling local and safe.

- [x] T52. Add build/package flow
  - Build backend, frontend, and Electron app together.
  - Document local run commands.

- [x] T53. Add updater release configuration
  - Add `electron-updater` and configure Electron Builder publish metadata for GitHub releases.
  - Point update publishing at `vojtechportes/card-notes-app`.
  - Keep local/dev runs safe by disabling updater network behavior outside packaged production builds.

- [x] T54. Add Electron updater service and secure IPC bridge
  - Create main-process updater orchestration for check, download, install, and error states.
  - Add a preload/IPC bridge so the renderer can request update checks without exposing broad Electron APIs.
  - Define typed updater state/events that the frontend can consume.

- [x] T55. Add Settings updater section and manual CTA
  - Add a dedicated updater area in Settings with localized copy and a CTA to check for updates on demand.
  - Show current app version, last known updater status, and whether an update is available/downloading/ready to install.
  - Allow the user to trigger install/restart once the update is downloaded.

- [x] T56. Add periodic background update checks
  - Check for updates on app startup when packaged.
  - Re-check roughly once per hour while the app is running.
  - Avoid overlapping checks and keep user-facing behavior quiet unless an update is found or a manual check was requested.

- [x] T57. Verify updater packaging and release flow
  - Ensure GitHub release artifacts include the files required by `electron-updater` in addition to the installer.
  - Validate the secret-based Windows signing flow still works with updater publishing.
  - Document the release/update process and known self-signed certificate limitations.

- [x] T58. Replace Windows PFX signing with Certum SimplySign cloud signing
  - Status: implementation complete; Certum-backed release validation is tracked separately in T58A.
  - Reference implementation to follow closely: ReactiveUI Extensions release workflow and shared Certum signing action.
  - Primary reference: `https://github.com/reactiveui/Extensions/blob/main/.github/workflows/release.yml`
  - Shared workflow reference: `https://github.com/reactiveui/actions-common/blob/main/.github/workflows/workflow-common-release.yml`
  - Signing action reference: `https://github.com/reactiveui/actions-common/blob/main/.github/actions/certum-sign/action.yml`
  - Use Variant A: build unsigned Electron release artifacts first, then sign the produced Windows artifacts in a dedicated signing step/job.
  - Replace the current `WINDOWS_CERT_BASE64` / `WINDOWS_CERT_PASSWORD` release flow with Certum SimplySign secrets.
  - Expected secrets: `CERTUM_USER_ID`, `CERTUM_OTP_URI`, `CERTUM_CERT_FINGERPRINT`.
  - Keep `GH_TOKEN` for release asset upload and updater publishing.
  - Add or vendor a small Certum signing action/script that starts `Xvfb`, opens SimplySign Desktop, logs in using the generated TOTP, exposes the certificate through PKCS#11, and signs with `jsign` or equivalent tooling.
  - Keep the Certum-specific automation isolated from the build script so regular local packaging can still run without signing credentials.
  - Sign the final NSIS installer referenced by `latest.yml`.
  - Investigate whether electron-builder already signs the inner app executable when signing is disabled; if not, add a follow-up subtask to sign inner `.exe` files before installer creation.
  - Verify the final installer signature before upload.
  - Verify `latest.yml`, installer, and blockmap are still uploaded together and remain compatible with `electron-updater`.
  - Document the CI behavior, required GitHub secrets, and known fragility around SimplySign GUI automation.
  - Test checklist:
    - `npm run package:release` still works locally without Certum secrets.
    - Release workflow fails early with a clear message when Certum secrets are missing.
    - Local tests cover signed-artifact metadata refresh and updater publisher metadata injection.

- [x] T58A. Validate Certum SimplySign release in GitHub Actions
  - Run a test release after the Certum cloud code-signing certificate is issued and GitHub secrets are configured.
  - Confirm the signing job signs the Windows installer successfully and signature verification passes before upload.
  - Confirm the published release includes `latest.yml`, the signed installer, and the refreshed installer blockmap, and that an older installed build can update from those assets.

- [x] T59. Sign inner Windows app executables before NSIS installer creation
  - Follow-up from T58: final installer signing is implemented, but `CSC_IDENTITY_AUTO_DISCOVERY=false` means electron-builder does not sign the inner `win-unpacked` application executables during packaging.
  - Add a pre-installer signing stage for inner `.exe` files once the Certum signer image is available and the final installer signing flow has been validated in CI.

## Phase 6: Testing and Verification

- [ ] T60. Backend tests
  - Notes CRUD.
  - Column CRUD/reorder/hide/delete modes.
  - Export/import append behavior.
  - Delete all notes.

- [ ] T61. Frontend component tests
  - Notes toolbar search/sort behavior.
  - Note create/edit modal validation.
  - Card delete confirmation.
  - Settings column deletion choice.
  - Export/import and danger zone confirmation.

- [ ] T62. Frontend integration tests
  - Page renders through app providers.
  - Notes and settings workflows with mocked API.

- [ ] T63. Build verification
  - Backend build passes.
  - Frontend build passes.
  - Electron build/package script runs or documents remaining blockers.

## Phase 7: Note Types

Detailed implementation plan: [TASK_PHASE-7.md](TASK_PHASE-7.md).

- [x] T70. Add note type domain and migration plan
  - Add a `note_types` persistence model with `id`, `title`, `createdAt`, and `updatedAt`.
  - Use `uuid/v4` for generated note type IDs.
  - Create an initial note type named `Default` during migration.
  - Seed the `Default` note type and default fields on fresh installs when no note types exist.
  - Migrate all existing fields/columns under the `Default` note type.
  - Add `noteTypeId` to fields/columns and link it to the owning note type.
  - Add `noteTypeId` to notes so every note can be edited/rendered with the correct field set.
  - Preserve all existing note data during migration.
  - Keep general settings shared across all note types.
  - Ensure `createdAt` and `updatedAt` default fields exist separately for every note type and remain undeletable per type.

- [x] T71. Backend note type API and scoped fields API
  - Add CRUD endpoints for note types, with destructive operations guarded by frontend confirmation.
  - Support note type deletion with explicit modes: delete associated notes, or move associated notes to another note type.
  - If no other note type exists during move, support creating a replacement note type as part of the migration flow.
  - When moving notes to another type, show a mapping UI; preselect mappings where field `name` and compatible `type` match, and treat remaining values as orphaned/unmapped.
  - Scope field listing, creation, update, reorder, hide, and deletion by `noteTypeId`.
  - Remove the old unscoped `/settings/columns` endpoints instead of keeping compatibility aliases.
  - Make field `name` uniqueness scoped to a note type instead of globally, unless implementation context shows global uniqueness is still required.
  - Keep column/field configuration owned by the settings domain.
  - Expose note type and scoped field contracts through Swagger.

- [x] T72. Backend notes behavior across note types
  - Update note create/update APIs to accept `noteTypeId`.
  - Keep the notes list endpoint returning all notes together by default.
  - Include note type metadata or enough IDs for the frontend to render each note with the correct fields.
  - Preserve search/sort behavior across all notes, including sorting by each note record's own `createdAt` and `updatedAt`.
  - Validate that note values only reference fields belonging to the note's `noteTypeId`.
  - Ensure backend responses provide enough note type and field metadata for frontend search across all note type fields.

- [x] T73. Frontend API types and data layer for note types
  - Regenerate API types from Swagger after backend contracts change.
  - Add note type request functions and TanStack Query hooks.
  - Update existing notes/settings hooks to fetch fields by note type where needed.
  - Keep `/api/*/requests.ts` functions returning Axios promises directly without `await`.

- [x] T74. Settings UI for note types and per-type fields
  - Add a note type management area in Settings using a data grid.
  - Show grid columns: `Name`, `Created at`, `Updated at`, and row actions for edit/delete.
  - Let the user create a new note type from the grid area.
  - Edit action edits only the note type title/name, not its columns.
  - Clicking a row opens a right-side detail drawer for that note type.
  - The drawer shows `Name`, `Created at`, and `Updated at`, followed by the existing Columns section scoped to that note type.
  - Keep General settings shared and visually separate from note-type-specific field settings.
  - Delete action opens a confirmation flow where the user chooses to delete associated notes or move them to another note type.
  - If moving and no other note type exists, allow creating a new note type during the migration flow.
  - If deleting the last remaining note type and its notes, recreate `Default` and inform the user in the delete dialog.
  - Include a mapping UI in the move flow; values without compatible mapped columns remain orphaned.
  - Keep Export / Import and Danger Zone behavior clear after note types are introduced.
  - Localize all new copy.

- [x] T75. Notes page support for mixed note types
  - Render all notes together on the Notes page.
  - In the create note dialog, the first input must be a note type select.
  - Load note fields only after the user selects a note type in create mode.
  - Use the selected note type's fields in the create modal.
  - In edit mode, keep the note type fixed and non-selectable while using the note's existing type fields.
  - Use each note's own note type fields when rendering cards and the right-side detail panel.
  - Consider showing a compact note type label on cards/details so mixed note lists remain understandable.
  - Keep existing search, sort, truncation, card field count, image, and link behavior working across note types.
  - Ensure MiniSearch indexes values from every note type's fields, while preserving each note's type context.
  - Add an advanced filter entry point that can filter by note type in the first implementation.
  - Keep advanced field-level filtering out of scope for the first note-types slice, but leave room to add it later.

- [x] T76. Import/export support for note types
  - Export note types, fields with `noteTypeId`, notes with `noteTypeId`, general settings, and note data.
  - Use the Phase 7 export/import format only; older pre-release export formats do not need compatibility support.
  - Let the user choose which note type imported note data should target.
  - Import into a target type should map fields by `name` and compatible `type`; unmatched fields should be reported clearly and handled without deleting existing data.
  - Ensure import still appends data and does not delete existing notes.
  - Update XLSX import so the chosen target note type controls field matching.

- [x] T77. Note type tests and verification
  - Fresh install creates `Default` and its per-type default fields.
  - Backend migration creates `Default` and preserves existing notes/fields.
  - Backend prevents deleting per-type `createdAt` and `updatedAt` fields.
  - Backend validates note values against the note's type fields.
  - Backend note type deletion supports deleting associated notes and moving associated notes to a selected or newly created note type, including explicit field mapping and orphaned value handling.
  - Frontend can create/edit notes for different note types.
  - Notes page renders mixed note types together.
  - Import can target a selected note type without deleting existing data.
  - Export/import round trip preserves note type relationships.
  - Existing build and package verification still passes.

- [ ] T78. Future advanced filtering query builder
  - Future/non-priority task: evaluate `@vojtechportes/react-query-builder` for advanced user-defined filters.
  - First supported advanced filter should be note type selection.
  - Future expansion should support filtering by fields across note types where the field type makes filtering meaningful.
  - Keep the query builder integration separate from the initial note type migration unless the implementation naturally needs a reusable filter model.
  - Ensure any future filter UI remains localized and works with mixed note type search results.

## Phase 8: Settings Sub-Pages

- [x] T80. Split Settings into sub-pages
  - Replace the long single Settings page with routed Settings sub-pages linked under the main Settings navigation item.
  - Left menu should show compact labels without descriptions for Settings sub-page links; keep parent Notes and Settings descriptions visible.
  - Use this navigation shape: General, Note templates, Export / Import, Data Management.
  - Keep Settings as the parent navigation item and show the sub-page links underneath it.
  - Ensure the Settings landing/default route opens General or redirects there consistently.

- [x] T81. Move General settings into a dedicated page
  - Change the page title to General instead of the generic Settings title.
  - Add a General-specific page description that explains app-wide display preferences.
  - Keep app-wide display preferences here, including optional text truncation character count.
  - Keep optional number of fields displayed on cards here while it remains a global setting.
  - Keep future global defaults, such as default sort or view behavior, scoped to this page.
  - Localize all labels, headings, actions, validation, empty states, and status copy.

- [x] T82. Rename Note types copy to Note templates
  - Change user-facing copy from Note types to Note templates where it describes the configurable note structure.
  - Prefer copy-only changes if possible; avoid noisy route, API, database, or internal type renames unless implementation context proves they are worthwhile.
  - Keep existing domain names such as note types internally when renaming them would add risk without user-visible benefit.
  - Localize all renamed copy.

- [x] T83. Move note template and field management into a dedicated Note templates page
  - Change the page title to Note templates instead of the generic Settings title.
  - Add a Note templates-specific page description that explains templates and their nested fields.
  - The Note templates page owns template list/create/rename/delete flows.
  - Fields must stay nested under the selected note template; do not add Fields as a top-level Settings sub-page.
  - Keep per-template field management here: add, edit, reorder, hide, delete, and configure field type/settings.
  - Preserve the current field deletion confirmation behavior: remove only the field definition or remove the field definition plus associated note data.
  - Keep non-removable per-template default fields such as `createdAt` and `updatedAt` visible and protected.
  - Keep note template deletion confirmation and note-moving/mapping behavior in this page.

- [x] T84. Move Export / Import into a dedicated page
  - Change the page title to Export / Import instead of the generic Settings title.
  - Add an Export / Import-specific page description that explains moving data in and out of the app.
  - Keep JSON export/import flows here.
  - Keep XLSX import here if it remains part of the import workflow.
  - Preserve append-only import behavior; imports must not delete existing notes.
  - Keep target note template selection and field mapping behavior clear when importing.
  - Show localized validation, success, and error states.

- [x] T85. Move destructive data operations into a Data Management page
  - Change the page title to Data Management instead of the generic Settings title.
  - Add a Data Management-specific page description that explains destructive and maintenance data actions.
  - Use Data Management as the page label instead of Danger Zone.
  - Keep Danger Zone as an internal section title inside this page for destructive controls.
  - Move Delete all notes here and continue requiring confirmation before calling the API.
  - Leave room for future reset/cleanup/backup-adjacent actions without making the navigation feel alarming.
  - Localize all copy and confirmation text.

- [x] T86. Verify Settings sub-page behavior
  - Frontend tests cover navigation between Settings sub-pages.
  - Tests verify each Settings sub-page renders its own localized page title and page description.
  - Tests verify Fields are only reachable within the selected Note templates flow, not as a separate Settings page.
  - Tests verify Note templates copy appears in the UI instead of Note types where applicable.
  - Tests verify Data Management page contains the destructive Delete all notes flow and still uses confirmation.
  - Existing Settings workflows for general settings, template/field management, export/import, and destructive actions still pass.
  - Frontend build passes.

- [x] T87. Refine Settings sub-page card headings and Data Management copy
  - Remove the duplicate internal card title and subtitle from the Note templates card.
  - Remove the duplicate internal card title and subtitle from the Export / Import card.
  - Use the Danger Zone summary as the section subtitle and remove the old generic subtitle.
  - Rewrite the Data Management page subtitle in plain user-facing language.
  - Update frontend tests for the adjusted visible copy and removed duplicate card headings.

- [x] T88. Move Updates into a dedicated Settings page
  - Remove the updater section from the General settings page.
  - Add a dedicated Updates settings page with localized page copy.
  - Add Updates to the Settings submenu immediately before Data Management.
  - Preserve the existing updater behavior and verify the new route and navigation.

## Misc tasks

- [x] TMSC-10. Add logo, favicon and eletron app logo
  - Source logo is located in `frontend/*/assets/logo.png` and `frontend/*/assets/favicon.png`

- [x] TMSC-11. Rename the app to "NoteStack"

- [x] TMSC-12. Refactor note field value components
  - Create a `components` folder under `frontend/src/pages/notes-page/components/note-field-value`.
  - Split note field value rendering into individual components for text, image, number, and link values.
  - Keep components slim and preserve one utility per file / one component per file conventions.

- [x] TMSC-13. Add shared note image preview overlay
  - Reuse the note card image styling through a shared preview component.
  - Cap detail image previews at 520px while preserving card image sizing.
  - Add a generic image overlay with backdrop, close action, and viewport-constrained centered image.

- [x] TMSC-14. Align detail titles and image borders
  - Add a theme-derived light border to note image preview containers.
  - Match note detail field title styling to the note card list title styling.
  - Match Settings side drawer detail title styling to the note card list title styling.

- [x] TMSC-15. Add multi-image fields
  - Add settings-owned image field configuration for single-image vs multi-image behavior.
  - Import duplicate XLSX image headers into a configured multi-image field in sheet order.
  - For duplicate XLSX image headers mapped to a single-image field, import only the first image value.
  - Render multi-image previews as 128px square tiles; in card lists show the first image plus a `+N` overflow tile.
  - Keep existing single-image notes and imports compatible.

- [x] TMSC-16. Improve responsiveness of the notes page and mansonry layout

- [x] TMSC-17. Add backend startup loading screen and recovery flow
  - Create and display the normal Electron application window immediately instead of waiting for backend readiness before rendering the frontend.
  - Add a localized MUI startup gate that renders before the existing layout and prevents notes/settings pages and their API queries from mounting until the backend is healthy.
  - Reuse the NoteStack logo and theme, and show accessible visible progress copy with an indeterminate loading indicator.
  - Add a narrow Electron/preload startup bridge with current-state retrieval, state subscription, retry, open-log, and exit actions.
  - Model startup as `starting`, `starting` with a `taking-longer` phase, `ready`, or `failed` for concrete launch/process failures.
  - Replace the terminal arbitrary startup timeout with a soft 15-20 second `taking-longer` threshold while continuing bounded `/api/health` polling until the backend is ready, exits, retry is requested, or the app closes.
  - Keep each health request independently bounded so a stalled request cannot stop subsequent polling.
  - During the `taking-longer` phase, keep the spinner active and offer Retry, Open backend log, and Exit without presenting the state as a terminal error.
  - Treat backend entrypoint/spawn errors and child-process exit before readiness as terminal recoverable failures with localized reason-specific copy.
  - Make retry single-flight and cancellation-safe; terminate only the backend child owned by the active attempt before starting a replacement attempt.
  - Use an attempt generation token or `AbortController` so late results from an older attempt cannot overwrite the state of a newer retry.
  - Reuse an already healthy backend without claiming ownership, and never terminate a pre-existing backend during retry or application shutdown.
  - Open or reveal only the fixed NoteStack backend log path from the main process; handle the log not existing yet without crashing the renderer.
  - Preserve updater initialization/state delivery and existing navigation behavior while the startup gate is introduced.
  - In standalone Vite/browser environments where the Electron startup bridge is unavailable, default to `ready` so current frontend development and tests continue to work.
  - Add lifecycle logging for startup attempt creation, prolonged startup, retry/cancellation, readiness, concrete failure, and owned-child termination.
  - Add Electron tests for polling beyond the soft threshold, concrete process failures, retry cancellation, stale-attempt protection, backend ownership, log actions, and cleanup on exit.
  - Add frontend tests for branded loading/prolonged/failure states, localized recovery actions, bridge subscription/current-state behavior, browser fallback, and mounting the existing app only after `ready`.
  - Verify Electron and frontend lint/tests/build, packaged backend smoke checks, and a manual packaged cold-start plus failure/retry flow.

- [x] TMSC-18. Rework side menu subitem width
  - Remove the Settings submenu container indentation so subitems match the parent item width.
  - Preserve submenu selection, routing, spacing, and responsive drawer behavior.
  - Verify the existing frontend navigation coverage and frontend build.

- [x] TMSC-19. Simplify startup messaging
  - Show only plain user-facing information that NoteStack is starting on the initial startup screen.
  - Remove backend-log wording and access from the prolonged startup screen while preserving appropriate recovery actions.
  - Double the prolonged-start threshold from 15 seconds to 30 seconds.
  - Keep the startup screen centered within the visible application viewport.
  - Update startup-screen tests and verify the frontend and Electron changes.

- [x] TMSC-20. Polish user-facing notes and startup copy
  - Replace technical layout terminology in the Notes empty state with plain user-facing wording.
  - Remove invisible reserved logo space so visible startup content is vertically centered.
  - Remove the redundant standalone app-name heading from the startup screen.
  - Update focused frontend coverage while preserving internal masonry implementation names.

## Sub-Agent Execution Plan

- Planning agent: validate the next implementation slice against `AGENTS.md`, identify scope, constraints, test checklist, and risks before coding.
- Worker agent 1: own Phase 0 and the minimal scaffold needed for Phase 1/2 to compile.
- Worker agent 2: own backend feature slices after scaffold exists.
- Worker agent 3: own frontend feature slices after scaffold exists.
- Code review agent: review diffs after each substantial worker output and before a task is considered complete.

## Current First Slice

Start with T00-T02 plus the minimum T10/T20 setup needed to run basic backend/frontend build commands. Keep the first slice intentionally small: project structure, package scripts, TypeScript configs, and minimal app entry points. Do not implement full notes/settings behavior in the scaffold slice.
