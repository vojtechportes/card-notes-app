# Phase 9: Note Labels Plan

This document expands `TASKS.md` Phase 9 into an implementation-ready plan for reusable labels, label-backed note fields, import/export, and label filtering. The backend Swagger contract remains the source of truth for generated frontend types.

## Goals

- Add reusable labels with a title, unique source-scoped name, color, optional owning note template, and timestamps.
- Support shared labels and note-template-specific labels.
- Add a dedicated Settings > Note labels page with a data grid and create/update/delete flows.
- Add a `labels` note field type whose configuration controls single/multiple selection and allowed label sources.
- Render labels consistently as small, filled MUI Chips in Settings, note forms, cards, details, and filters.
- Preserve label relationships in JSON export/import while deliberately excluding label interpretation from XLSX import.
- Extend advanced filters with label selection and explicit AND/OR matching.

## Product Assumptions Requiring Confirmation

1. A label field may select shared labels and labels from any selected note templates, not only the field's owning template. An empty source selection means all shared and template-specific sources.
2. Label names are trimmed and unique within a source. Shared labels form one source; each note template forms another source. Whether uniqueness should be case-sensitive (matching current field-name behavior) or case-insensitive needs confirmation. Label titles do not need to be unique.
3. Colors are stored as validated `#RRGGBB` values. The UI may provide a native/custom color picker plus a preview Chip; arbitrary valid colors are supported rather than only theme palette names.
4. Deleting a label requires confirmation and removes that label ID from every affected note value transactionally. Notes and label fields remain in place.
5. Moving a label between shared/template-specific sources is allowed only when the target source has no conflicting name. Existing note assignments remain valid, even if a field's configured sources would no longer offer that label for new selection; the UI should surface legacy assignments until the user removes them. If stricter pruning is desired, it needs a separate destructive confirmation design.
6. JSON import resolves labels by source plus normalized name. It reuses an existing match instead of creating a duplicate and does not overwrite the existing label's title/color without an explicit future conflict policy.
7. Advanced label filtering is global across all label fields on a note: OR matches at least one selected label; AND requires every selected label to occur somewhere on the note.

## Out Of Scope

- Treating arbitrary XLSX text cells as labels or creating labels from XLSX values.
- Per-field nested AND/OR expression trees or full query-builder integration.
- Label hierarchies, groups, icons, descriptions, ordering, or user-defined aliases.
- Automatic bulk reassignment/merge of labels.
- Per-label permissions or multi-user behavior.
- A generic cross-domain tagging framework outside notes.

## Data Model And Migration

### Labels

Add a `labels` table owned by the Settings domain:

```ts
interface Label {
  id: string;
  title: string;
  name: string;
  color: string;
  noteTypeId: string | null;
  createdAt: string;
  updatedAt: string;
}
```

Suggested persistence shape:

- `id TEXT PRIMARY KEY`
- `title TEXT NOT NULL`
- `name TEXT NOT NULL`
- `color TEXT NOT NULL`
- `note_type_id TEXT NULL`
- `created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP`
- `updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP`
- foreign key from `note_type_id` to `note_types(id)` with deletion behavior defined explicitly

SQLite uniqueness needs two indexes because nullable values do not collide under a normal composite unique constraint:

- unique shared-label index on `name` where `note_type_id IS NULL`
- unique template-label index on `(note_type_id, name)` where `note_type_id IS NOT NULL`

Use a new idempotent database migration and `uuid/v4` for label IDs. Deleting a note template should delete its label definitions and prune those label IDs from note values in the same existing note-template deletion transaction.

### Label Field Configuration

Extend `ColumnTypeEnum` with `Labels = 'labels'`. Keep configuration in the Settings/columns domain.

Recommended conceptual configuration:

```ts
interface LabelsColumnConfig {
  allowMultiple: boolean;
  sources: {
    includeShared: boolean;
    noteTypeIds: string[];
  } | null;
}
```

Rules:

- `sources: null` means all shared and note-template-specific label sources are allowed.
- The UI's empty source selection maps to `null`.
- An explicit source configuration may include shared labels, one or more note templates, or both.
- Every configured note-template ID must exist.
- Single-select fields accept zero or one label ID; multi-select fields accept a de-duplicated label-ID array.
- System timestamp fields cannot use label configuration.
- Changing a field from multi-select to single-select must be blocked while any note has multiple assigned labels, unless a future explicit migration choice is added.
- Changing allowed sources affects future selection; existing values follow the product assumption above unless the user chooses stricter behavior.

### Note Values

Store label field values in the existing `note_values.value_json` structure as arrays of label UUIDs. Use an empty array/no value for no selection, including single-select fields, so the runtime representation is consistent.

Backend validation must ensure:

- every ID resolves to an existing label;
- every label belongs to a source allowed by the field configuration;
- values are de-duplicated;
- single-select fields contain at most one ID;
- a note value belongs to a Labels field owned by the note's template.

All label deletion/import operations that rewrite note values must be transactional. Filtering can remain local/client-side unless repository profiling shows a need for normalized join tables.

## Backend API And Service Plan

Keep label configuration under Settings.

### Label CRUD

- `GET /settings/labels` returns all labels for the grid and selectors, with optional source filters if useful.
- `POST /settings/labels` creates a shared or template-specific label.
- `PATCH /settings/labels/:id` updates title, name, color, and optionally source under the conflict rules above.
- `DELETE /settings/labels/:id` deletes after frontend confirmation and returns the number of affected note values.

Swagger DTOs should expose label source nullability clearly. Normalize names before uniqueness checks, validate note-template references, validate color format, and translate database uniqueness failures into stable conflict responses.

Repository/service work should stay slice-local. Prefer a dedicated labels repository/service inside the Settings module over expanding already-large files when that keeps ownership clear without introducing a generic abstraction.

### Notes Validation

Extend note create/update validation for the Labels type. Responses continue returning note values by field ID; frontend queries resolve label IDs against the labels query. Define behavior for a missing referenced label defensively so a corrupt/legacy value does not crash rendering.

### Note Template Deletion

Extend both delete-notes and move-notes flows:

- delete source-template labels when their source template is deleted;
- prune deleted label IDs from all remaining notes, regardless of their note template;
- when moving notes, validate mapped Labels fields and retain only assignments accepted by the target field configuration;
- report dropped/unmapped label values consistently with existing field-mapping results.

## Frontend Data Layer

- Regenerate API types from Swagger after backend contracts change.
- Add `/api/settings` label request functions that return full Axios promises directly.
- Add TanStack Query hooks for list/create/update/delete.
- Add stable label query keys and invalidate label/note/detail queries after mutations that alter rendered label metadata or note assignments.
- Keep value/source conversion in focused one-function utility files.

## Settings > Note Labels

Add `note-labels` to Settings routing and navigation, positioned after Note templates and before Export / Import.

The page contains a data grid modeled on Note templates with:

- Label title, rendered as a small filled Chip using the configured color
- Label name
- Note template, empty/shared display when `noteTypeId` is null
- Created at
- Updated at
- row actions for edit and delete

The create/update dialog should be its own slim component and use react-hook-form plus yup. Fields:

- Label title
- Label name
- Source: Shared or a selected note template
- Color picker/input with live Chip preview

Use the existing date formatting and confirmation patterns. Keep all copy in i18n JSON. The grid container, dialog, Chip renderer, and destructive confirmation should remain separate components where they have distinct responsibilities.

## Note Template Field Configuration

Add Labels to the field-type selector. When selected, show a focused Labels configuration component:

- single vs multiple label selection;
- allowed sources as a multi-select containing Shared plus note templates;
- helper copy explaining that no selected sources means all sources.

Field create/update schemas and DTO mapping must validate the Labels configuration without leaking it into unrelated field types. Existing image-specific configuration should remain independent.

## Note Create/Edit And Display

- Fetch labels needed by note forms and note display through a shared query hook.
- Filter choices by the field's configured sources.
- Use an Autocomplete/select UI that renders options and selected values as small filled Chips.
- Single-select fields allow zero or one value; multi-select fields allow multiple values without duplicates.
- Cards and the right-side detail render each assigned label as a small filled Chip, wrapping cleanly.
- MiniSearch indexes current label titles and names so label text is searchable.
- Missing label IDs render a safe localized fallback or are omitted with a non-fatal diagnostic, according to the established error-display style.
- Use accessible contrast for Chip text when applying arbitrary background colors.

## Export / Import

Increment the JSON export schema version and include labels before notes are serialized. Label field values remain label IDs in exported notes. Keep the immediately previous JSON format importable by treating it as label-free data, so backups made by the current app do not become unusable after this feature ships.

JSON import must:

- validate label definitions, colors, sources, and label field configurations;
- map imported note-template IDs first;
- map each label's source through the note-template mapping;
- resolve labels by source plus normalized name;
- create missing labels with new UUIDs and maintain an imported-to-local label ID map;
- rewrite label field source IDs and note label values using resolved IDs;
- append without deleting existing notes or labels;
- report skipped/conflicting label definitions and invalid label references clearly.

XLSX import must not map worksheet columns to Labels fields and must not infer or create labels. Labels fields should be excluded from XLSX match candidates and reported as unmatched/unsupported when relevant. Existing non-label XLSX behavior remains unchanged.

## Advanced Label Filters

Extend the existing Notes advanced-filter UI rather than introducing a second filter surface.

Filter state should include:

```ts
interface NotesFilterState {
  noteTypeIds: string[];
  labelIds: string[];
  labelMatchMode: "and" | "or";
}
```

Rules:

- no selected label IDs means no label constraint;
- OR matches notes containing at least one selected label across any Labels field;
- AND matches notes containing every selected label across any Labels field;
- note-template and label filters combine with AND;
- text search applies after/beside structured filters without changing current sort behavior;
- selected filters remain understandable through counts/chips and can be cleared accessibly.

Use small filled Chips in filter choices and active filter summaries. Keep the matching operation in a dedicated utility with unit tests.

## Incremental Implementation Slices

1. Migration, label domain, indexes, and CRUD API.
2. Labels column type, configuration contracts, and note-value validation.
3. Generated types, requests, query hooks, and shared Chip renderer.
4. Settings routing, grid, dialog, deletion confirmation, and localization.
5. Labels field configuration in Note templates.
6. Note create/edit controls, card/detail rendering, and search indexing.
7. JSON export/import and explicit XLSX exclusion.
8. Advanced AND/OR label filtering.
9. Regression tests, formatting, builds, and package-level verification.

## Test Checklist

### Backend

- migration creates the labels table and both source-scoped uniqueness indexes idempotently;
- shared names conflict only with shared names; the same name is allowed in different template sources;
- CRUD validates title/name/color/source and produces stable not-found/conflict errors;
- deleting a label prunes it from single- and multi-label note values transactionally;
- deleting a source note template removes its labels and safely updates notes that referenced them;
- labels field config accepts single/multiple and explicit/all-source modes;
- note create/update rejects nonexistent, duplicate, disallowed-source, and excess single-select IDs;
- changing multi-select to single-select cannot silently discard assignments;
- note-template move mapping handles Labels fields without leaking invalid assignments;
- JSON export/import round trip preserves labels, sources, field configuration, and note assignments;
- JSON import remaps note-template and label IDs and reuses source/name matches;
- XLSX import never maps to or creates Labels values.

### Frontend

- Settings navigation opens Note labels and renders localized title/description;
- grid renders the requested columns and a small filled colored Chip;
- create/update validation, source selection, color preview, and uniqueness errors work;
- delete uses confirmation and refreshes both labels and affected notes;
- Labels field configuration supports single/multiple and multiple/all sources;
- note forms offer only allowed labels and enforce selection cardinality;
- cards/details/search render/index current label metadata;
- arbitrary label colors retain readable text contrast;
- advanced filters support AND, OR, clear, note-template combination, and empty selection;
- slim components and one-utility-per-file conventions are preserved.

### Verification

- regenerate frontend Swagger types;
- run Prettier on every modified code/config/document file;
- run focused backend and frontend tests;
- run backend, frontend, and Electron lint/test/build suites as affected;
- run the root build and document any package-only blocker.

## Risks And Decisions

- SQLite nullable uniqueness requires partial unique indexes; a composite unique constraint alone is insufficient for shared labels.
- Arbitrary colors require contrast handling beyond MUI's finite `color` prop palette; use Chip styling while retaining the default filled variant and `size="small"` behavior documented by MUI.
- Source changes and label deletion can invalidate note values, so their mutation semantics must be transactional and user-visible.
- JSON import needs a two-stage note-template/label ID mapping before notes can be inserted, plus compatibility handling for the immediately previous label-free export version.
- Labels stored as JSON IDs fit the current note-value model and local dataset, but a future large-data filtering requirement may justify a normalized association table.
- The assumptions at the top of this plan should be confirmed before implementation begins, especially cross-template sources, source-change behavior, and import conflict handling.
