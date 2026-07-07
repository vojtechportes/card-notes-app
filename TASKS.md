# Card Notes App Tasks

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

- [ ] T11. Add SQLite persistence layer
  - Store data in a local SQLite database suitable for a single-user Electron app.
  - Keep database helpers inside the owning backend module/slice.
  - Add migration or initialization flow for required tables.

- [ ] T12. Model columns/settings domain
  - Add `ColumnTypeEnum` with text, date, number, image, and link values.
  - Column base shape must include `id`, unique `name`, `title`, and `type`.
  - Include ordering, hidden state, and non-removable default columns for `createdAt` and `updatedAt`.
  - Use `uuid/v4` for generated IDs.

- [ ] T13. Model notes domain
  - Notes must support structured values keyed by configured columns.
  - Notes must track `createdAt` and `updatedAt`.
  - Preserve note data when columns are removed unless the user explicitly chooses to delete associated data.
  - Support image data inserted from the frontend drag-and-drop workflow.

- [ ] T14. Backend notes API
  - Create, list, update, and delete notes.
  - Delete note requires frontend confirmation before calling the endpoint.
  - Support sorting by `createdAt` and `updatedAt` in ASC/DESC order.
  - Provide enough data for frontend MiniSearch indexing/search.

- [ ] T15. Backend settings/columns API
  - Create, list, update, reorder, hide, and delete columns.
  - Column delete must support two modes: remove definition only, or remove definition plus associated note data.
  - Persist general settings for optional truncation length and optional card field display count.

- [ ] T16. Backend export/import API
  - Export all notes/settings/columns data as JSON.
  - Import the same JSON format without deleting existing notes.
  - Add validation for import payloads.

- [ ] T17. Backend danger-zone API
  - Delete all notes endpoint.
  - Keep destructive operation semantics explicit for frontend confirmation.

## Phase 2: Frontend Foundation

- [x] T20. Scaffold React/Vite frontend around existing masonry component
  - Add `frontend/src/app.tsx`, `main.tsx`, `theme.ts`, and `i18n.ts`.
  - Configure MUI theme exactly as specified in `AGENTS.md`.
  - Configure i18next/react-i18next and keep all copy in JSON locale files.

- [ ] T21. Add frontend dependencies and providers
  - Add Axios client.
  - Add TanStack Query provider.
  - Add react-hook-form and yup setup patterns.
  - Add date-fns formatting utilities only where needed.

- [ ] T22. Add generated API types workflow
  - Add script similar to `k8s-frontend/scripts` for Swagger type generation.
  - Generate types into `frontend/src/types/api`.
  - Treat backend Swagger as source of truth.

- [ ] T23. Add frontend routing/layout
  - Add two pages: Notes home page and Settings page.
  - Provide navigation that feels like an app shell, not a marketing page.

- [ ] T24. Add shared confirmation service/modal
  - Copy or adapt confirmation service/modal pattern from `C:\Users\vojta\Documents\work\k8s-frontend`.
  - Use it for deleting notes, deleting all notes, and column deletion choices.

## Phase 3: Notes Experience

- [ ] T30. Build notes query hooks/API layer
  - Fetch notes, create note, update note, delete note.
  - Invalidate/update TanStack Query caches after mutations.

- [ ] T31. Build MiniSearch integration
  - Index searchable note values across all columns.
  - Keep search client-side over fetched note data.
  - Make search work with text, date, number, image metadata, and link display values where applicable.

- [ ] T32. Build notes toolbar
  - Search bar above notes.
  - Sort button/control for `createdAt` and `updatedAt`, ASC/DESC.
  - Add note action opening the note modal.

- [ ] T33. Build notes masonry card list
  - Render notes as MUI cards inside the existing masonry component.
  - Respect optional truncation setting.
  - Respect optional card field display count.
  - Render link columns as links that open in a new tab/window.
  - Render image columns appropriately.

- [ ] T34. Build note create/edit modal
  - Use react-hook-form and yup.
  - Generate form fields from active column definitions.
  - Support drag-and-drop image insertion.
  - Localize all labels, validation, and actions.

- [ ] T35. Build card delete flow
  - Each card has a delete action.
  - Deletion must use confirmation modal before API call.

- [ ] T36. Build right-side note detail panel
  - Opening a card detail shows a right-side panel similar to `k8s-frontend`.
  - Include edit and delete actions in the detail context.

## Phase 4: Settings Experience

- [ ] T40. Build settings query hooks/API layer
  - Fetch/update columns and general settings.
  - Import/export data.
  - Delete all notes.

- [ ] T41. Build Columns section
  - Add, edit, reorder, hide, and delete columns.
  - Support column types: text, date, number, image, link.
  - Prevent removal of default `createdAt` and `updatedAt` columns.
  - Enforce unique column `name`.

- [ ] T42. Build column deletion confirmation choice
  - Ask whether to remove only the column definition or also delete associated note data.
  - Make the two choices clear and localized.

- [ ] T43. Build General section
  - Optional text truncation character count.
  - Optional number of fields displayed on cards.

- [ ] T44. Build Export / Import section
  - Export all data as JSON.
  - Import JSON without deleting existing notes.
  - Show validation/success/error states.

- [ ] T45. Build Danger Zone section
  - Delete all notes button.
  - Require confirmation before deleting.

## Phase 5: Electron Integration

- [ ] T50. Wire Electron main process
  - Launch frontend window.
  - Start/connect to local backend.
  - Keep the app single-user and local-first.

- [ ] T51. Handle external links and files safely
  - Open link columns in the system browser/new tab behavior appropriate for Electron.
  - Keep image handling local and safe.

- [ ] T52. Add build/package flow
  - Build backend, frontend, and Electron app together.
  - Document local run commands.

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

## Sub-Agent Execution Plan

- Planning agent: validate the next implementation slice against `AGENTS.md`, identify scope, constraints, test checklist, and risks before coding.
- Worker agent 1: own Phase 0 and the minimal scaffold needed for Phase 1/2 to compile.
- Worker agent 2: own backend feature slices after scaffold exists.
- Worker agent 3: own frontend feature slices after scaffold exists.
- Code review agent: review diffs after each substantial worker output and before a task is considered complete.

## Current First Slice

Start with T00-T02 plus the minimum T10/T20 setup needed to run basic backend/frontend build commands. Keep the first slice intentionally small: project structure, package scripts, TypeScript configs, and minimal app entry points. Do not implement full notes/settings behavior in the scaffold slice.