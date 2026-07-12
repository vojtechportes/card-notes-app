# Phase 7: Note Types Plan

This document expands `TASKS.md` Phase 7 into an implementation-ready plan. It reflects the requested note type model, Settings UI behavior, migration from the current single-type app, and the REST API shape that should drive generated frontend types.

## Goals

- Introduce multiple note types while preserving all existing notes and fields.
- Create a `Default` note type automatically for both existing databases and fresh installs.
- Migrate existing data into the `Default` note type.
- Keep `createdAt` and `updatedAt` as undeletable default fields for every note type separately.
- Keep general settings shared across all note types.
- Render all notes together on the Notes page, regardless of type.
- Search across fields from all note types.
- Add an initial advanced filter for note type selection, with field-level filtering left for a future slice.
- Let imports target a selected note type.

## Out Of Scope For First Slice

- Field-level advanced filtering across arbitrary field types.
- Full integration of `@vojtechportes/react-query-builder`.
- Cross-note-type field sharing.
- Per-note-type general settings.
- Normal note edit flow for changing a note from one type to another.
- A full advanced reusable field-mapping framework beyond the delete/move migration flow.

## Data Model

### Note Type

Requested structure:

```ts
interface NoteType {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}
```

Persistence table proposal: `note_types`.

Columns:

- `id text primary key`
- `title text not null unique`
- `created_at text not null`
- `updated_at text not null`

The app should seed a `Default` note type when the database is initialized and no note types exist. This applies to fresh installs and migrated existing installs.

### Field / Column Changes

Existing fields/columns should gain `noteTypeId`.

```ts
interface NoteColumn {
  id: string
  noteTypeId: string
  name: string
  title: string
  type: ColumnTypeEnum
  sortOrder: number
  isHidden: boolean
  isDefault: boolean
  config?: Record<string, unknown> | null
}
```

Rules:

- `name` uniqueness should be scoped to `noteTypeId`.
- `createdAt` and `updatedAt` columns are created for each note type.
- Default columns cannot be deleted, hidden, renamed, or moved in a way that breaks existing date rendering.
- Column configuration remains owned by the settings domain.

### Note Changes

Existing notes should gain `noteTypeId`.

```ts
interface Note {
  id: string
  noteTypeId: string
  values: Record<string, NoteValue>
  createdAt: string
  updatedAt: string
}
```

Rules:

- Notes list returns all notes by default.
- Note create requires `noteTypeId` once Phase 7 is active.
- Note update cannot change `noteTypeId` in the first slice.
- Note values must reference fields owned by the note's `noteTypeId`.

## Migration And Fresh Install

Migration should be idempotent.

1. Create `note_types` table.
2. Create a `Default` note type if no note types exist.
3. Add `note_type_id` to columns/fields.
4. Add `note_type_id` to notes.
5. Assign existing columns and notes to `Default`.
6. Ensure every note type has `createdAt` and `updatedAt` default columns.
7. Ensure fresh installs also start with the `Default` note type and its default columns.
8. Add constraints/indexes after backfill where SQLite allows it safely.

Indexes to consider:

- `note_types(title)` unique.
- `note_columns(note_type_id, name)` unique.
- `notes(note_type_id)`.
- Existing timestamp indexes if useful for sorting.

## REST API Proposal

The API should stay under the existing domain style where Settings owns configuration and Notes owns note data.

### Note Types

`GET /settings/note-types`

Returns all note types sorted by title or created date.

Response:

```ts
NoteTypeDto[]
```

`POST /settings/note-types`

Creates a note type and its per-type default fields.

Request:

```ts
interface CreateNoteTypeDto {
  title: string
}
```

Response:

```ts
NoteTypeDto
```

`GET /settings/note-types/:id`

Returns note type detail and its fields for the Settings drawer.

Response recommendation:

```ts
interface NoteTypeDetailDto extends NoteTypeDto {
  columns: ColumnDto[]
}
```

`PATCH /settings/note-types/:id`

Renames the note type. Editing note type only changes `title`.

Request:

```ts
interface UpdateNoteTypeDto {
  title?: string
}
```

Response:

```ts
NoteTypeDto
```

`DELETE /settings/note-types/:id`

Deletes a note type using one explicit migration mode.

Request body proposal:

```ts
interface DeleteNoteTypeDto {
  mode: 'delete-notes' | 'move-notes'
  targetNoteTypeId?: string
  createTargetNoteType?: {
    title: string
  }
}
```

Rules:

- If `mode` is `delete-notes`, delete all notes associated with the note type, then delete the note type and its fields.
- If `mode` is `move-notes`, move notes to `targetNoteTypeId`.
- If there is no other note type, the frontend can send `createTargetNoteType` so the backend creates a new type and moves notes to it.
- Moving notes across note types uses the mapping rules from the `Move Mapping UI` section below.
- If the user deletes the last remaining note type with `delete-notes`, the backend must recreate `Default` immediately so the app never has zero note types.
- The delete dialog must inform the user that `Default` will be recreated when deleting the last remaining note type.

Response:

```ts
interface DeleteNoteTypeResultDto {
  deletedNoteTypeId: string
  deletedNotesCount: number
  movedNotesCount: number
  targetNoteTypeId?: string
}
```

### Fields / Columns Scoped By Note Type

Prefer nested routes so ownership is clear.

`GET /settings/note-types/:noteTypeId/columns`

Returns fields for one note type.

`POST /settings/note-types/:noteTypeId/columns`

Creates a field under one note type.

`PATCH /settings/note-types/:noteTypeId/columns/order`

Reorders fields under one note type.

`PATCH /settings/note-types/:noteTypeId/columns/:id`

Updates one field. The field must belong to `noteTypeId`.

`DELETE /settings/note-types/:noteTypeId/columns/:id?deleteMode=definition-only|definition-and-values`

Deletes one field from one note type. Existing delete semantics remain, but scoped to notes of that type.

Compatibility decision:

- Do not keep the old unscoped `/settings/columns` endpoints after Phase 7 is implemented.
- Frontend and generated API usage must move to note-type-scoped column routes.

### Notes

`GET /notes?sortBy=createdAt&sortDirection=desc&noteTypeIds=id1,id2`

Returns all notes by default. `noteTypeIds` is optional and supports the initial advanced note type filter.

Response recommendation:

```ts
interface NoteDto {
  id: string
  noteTypeId: string
  values: Record<string, NoteValue>
  createdAt: string
  updatedAt: string
}
```

The frontend should fetch note types/columns separately or receive an aggregate metadata endpoint if that becomes simpler.

`POST /notes`

Request:

```ts
interface CreateNoteDto {
  noteTypeId: string
  values?: Record<string, NoteValue>
}
```

`PATCH /notes/:id`

Request:

```ts
interface UpdateNoteDto {
  values?: Record<string, NoteValue | null>
}
```

Do not support changing a note's type through normal edit in the first slice.

`DELETE /notes/:id`

No API shape change.

`DELETE /notes`

No API shape change. Deletes all notes across all note types after frontend confirmation.

### Export / Import

`GET /export-import/export`

Export payload should include:

```ts
interface ExportImportDataDto {
  version: 2
  noteTypes: NoteTypeDto[]
  columns: ColumnDto[]
  generalSettings: GeneralSettingsDto
  notes: NoteDto[]
}
```

Compatibility decision:

- Older export/import formats do not need compatibility support before public usage.

`POST /export-import/import`

Multipart form fields:

- `file`: JSON or XLSX file.
- `targetNoteTypeId`: required for XLSX imports and JSON imports that target one existing note type.
- `fieldMappingMode`: optional future field, likely `match-by-name` first.

Recommended first-slice behavior:

- JSON imports use the Phase 7 export format and preserve note type relationships.
- JSON files that do not match the Phase 7 format can be rejected with a clear validation error.
- XLSX imports rows into `targetNoteTypeId` and maps columns by field `name`.
- Import still appends and never deletes existing notes.

## Settings UI Plan

### Note Types Grid

Add a Note Types section to Settings.

Grid columns:

- `Name`
- `Created at`
- `Updated at`
- row actions: edit, delete

Actions:

- `Create note type` opens a small create form/dialog.
- Edit action allows editing only the note type title.
- Delete action opens a destructive confirmation flow.

### Delete Flow

When deleting a note type, user chooses:

- Delete all associated notes.
- Move associated notes to another note type.

If moving:

- Show a select list of other note types.
- If no other note type exists, show an option to create a new note type inline during the migration flow.
- Show the mapping UI described below before confirming the move.

### Move Mapping UI

When moving notes from one note type to another, the delete flow should include a mapping step.

Mapping behavior:

- Preselect target fields where the source field `name` matches and the `type` is compatible.
- Let the user review and adjust mappings before confirming the move.
- Only allow mapping between compatible field types.
- Values with no compatible mapped target field remain orphaned/unmapped.
- The confirmation copy must clearly state how many fields are mapped and how many will remain orphaned.
- Orphaned values must not delete unrelated existing data.

Backend behavior:

- Accept an explicit field mapping in the delete/move request.
- Validate every mapping pair belongs to the source and target note types.
- Reject incompatible field mappings.
- Preserve mapped values on moved notes.
- Preserve or report orphaned values according to the final storage strategy chosen during implementation.

### Note Type Detail Drawer

Clicking a grid row opens a right-side drawer.

Drawer content:

- Name/title
- Created at
- Updated at
- Columns section scoped to the selected note type

The Columns section should reuse the current Settings Columns behavior as much as possible, but it must operate through note-type-scoped data and endpoints.

## Notes Page Plan

- Render all notes together by default.
- Each note card/detail uses its own `noteTypeId` to resolve fields.
- Add note type selector to the create note modal.
- Edit note modal uses the note's existing type and does not change it in the first slice.
- Consider showing a compact note type label on cards and detail drawer.
- Search indexes values from every note type field.
- Advanced filter entry point initially supports note type selection.

## Search And Filtering

MiniSearch indexing should include:

- note id
- note type id
- note type title
- visible field values for that note's type
- date/number/link display values as currently supported
- image metadata where useful

Initial advanced filter:

```ts
interface NotesFilterState {
  noteTypeIds: string[]
}
```

Future filter expansion can evaluate `@vojtechportes/react-query-builder` for field-level filtering. Keep this future work separate unless the initial filter state naturally aligns with the package.

## Incremental Implementation Slices

1. Backend migration and fresh-install seeding.
2. Backend note type APIs and scoped column APIs.
3. Backend notes validation and `noteTypeId` support.
4. Export/import changes including old JSON and XLSX target note type support.
5. Regenerate frontend API types and add request/query hooks.
6. Settings Note Types grid, create/edit/delete flows, and detail drawer.
7. Notes page create/edit/card/detail updates.
8. Search and note type filter UI.
9. Tests, build verification, and migration verification.

## Test Checklist

Backend:

- Fresh install creates `Default` and its default fields.
- Migration creates `Default` and assigns existing notes/columns to it.
- Migration is idempotent and preserves existing note values.
- New note type creation adds default `createdAt` and `updatedAt` fields.
- Default fields cannot be deleted.
- Field names are unique within a note type, but can repeat across note types.
- Notes reject values for fields outside their note type.
- Deleting a note type can delete associated notes.
- Deleting a note type can move notes to another existing type and map compatible field values.
- Deleting the only note type can create a replacement type and move notes to it.
- Deleting the only note type with note deletion recreates `Default` and informs the user in the delete dialog.
- Import Phase 7 JSON into a selected note type or with preserved note type relationships, depending on import mode.
- XLSX import targets selected note type.

Frontend:

- Settings shows note types grid with create/edit/delete actions.
- Clicking a note type row opens the drawer with metadata and scoped columns.
- Delete flow supports delete-notes and move-notes modes.
- Move flow supports creating a target note type when no other type exists.
- Create note modal asks for note type.
- Edit note modal uses the note's existing type fields.
- Notes page renders mixed note types together.
- Search finds notes across fields from different note types.
- Advanced filter can filter by note type.
- All new copy is localized.

Build:

- Backend build passes.
- Frontend build passes.
- API type generation passes.
- Electron package flow still works after data contract changes.

## Risks And Decisions

- Moving notes between types requires a mapping UI in the delete/move flow; compatible `name`/`type` matches should be preselected, and unmapped values become orphaned.
- Deleting the last note type must leave the app usable by recreating `Default` and informing the user in the delete dialog.
- Old unscoped `/settings/columns` endpoints should be removed as part of Phase 7; only scoped column routes should remain.
- Older export/import formats do not need compatibility support before public usage.
- Mixed-type search can become more complex later, but MiniSearch over fetched local notes is still appropriate for this single-user Electron app.
