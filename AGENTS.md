## App description

Card Notes App is a Electron app consisting of nest.js backend and react frontend. To store data, the app is using local SQLlite database.

The app is supposed to collect structured notes of same type that will allow the user to search through, sort and so on. The app is intended for one user only. User should be able to set note "columns" that can be later added or removed, reordered without a loss of any data. The notes should be searchable (by all columns), sortable by created at date, editable. Also, the notes should allow the user to insert an image via drag and drop.

The notes will be displayed in cards. Card will be added or edited via a modal. Each card should be deletable after user confirmation. Deletion of note or any destructive operation should require confirmation. Confirmation modal/service can be copied or adapted from C:\Users\vojta\Documents\work\k8s-frontend.

### App structure

The application should have two pages

### Notes (home page)

Displays notes in card using mansory for rendering the notes. Notes should be rendered in MUI card
Above the list of notes, there should be a search bar and sort button with possibility to sort notes by createdAt, updatedAt (ASC/DESC).

Each card should have a detail that will open on the right same as in C:\Users\vojta\Documents\work\k8s-frontend

### Settings

Settings should allow user to add columns (fields) to the notes, reorder, delete and hide.
Each column should have data type selection - text, date, number, image, link (same as text, but it will render a link and allow user to open the link in a new tab).
When deleting a column, user should confirm whether they want to delete only the column definition or also delete all note data associated with that column.

Columns should have the following base structure:

```
id: string (uuid)
name: string (unique)
title: string (what user sees as a title of the column)
type: ColumnTypeEnum
```

Additional column configuration can be added as needed, but should stay owned by the columns/settings domain.

Also in settings, user should be able to set how many characters should be displayed before the text is truncated. This should be optional.

Another editable configuration is how many columns (fields) to display in the card (optional)

Default columns that are not removable are createdAt and updatedAt.

The whole settings section should be split into two parts "Columns", "General", "Export / Import" and "Danger Zone". This split will be done just by title and then the settings that belong to that given sections.

Under "Export / Import" the app should allow the user to export all notes data in JSON format. Same JSON should be importable as well. Import will not delete previously existing notes.

In "Danger Zone", Delete all notes button should be available. If clicked, confirmation modal will be triggered and if confirmed, all existing notes will be deleted.

## Libraries and architecture

The whole application is electron application written in Typescript.
For database, the application is using local Sqllite database. Search over data is performed via minisearch.

To generate UUIDs, use uuid/v4.

If possible, backend and frontend should have their separate package jsons and should be runnable locally. Then they should be bundled into an electron app.

### frontend

Frontend should use a similar generator like here C:\Users\vojta\Documents\work\k8s-frontend\scripts to generate a types from the swagger backend is exposing into exactly same structure. For testing, use react-testing-library and vite test. For http requests to backend, use axios. For queries themselves, use tanstack query. As a UI library, use MUI. For forms and form validation use react-hook-form and yup.
For internacionalization, use i18next and react-i18next. To style the app, standard MUI way of styling things. For non-complex styles, use sx property, otherwise use emotion styled. For date formatting, use date-fns.

All copy needs to be localized via i18n json files.

In general, you can draw an inspiration here C:\Users\vojta\Documents\work\k8s-frontend

Structure of frontend should be

```
/frontend
  /src
    /api
      /settings
        /requests.ts
      /notes
        /requests.ts
      /export-import
        /requests.ts
    /components // shared UI components
      /component-name
        /component-name.tsx
    /utils // shared utility functions
    /hooks // shared hooks
    /constants
    /types
      /api // Generated types from backend
      // shared types
    /pages
      /page-name
        /utils
        /hooks
        /constants
        /components
          /component-name
            /component-name.tsx
        /page-name.tsx
    /app.tsx
    /main.tsx
    /theme.ts
    /i18n.ts

```

Example of function in /api/*/requests.ts

```
import type { AxiosResponse } from 'axios';
import { apiClient } from '../../utils/api-client';
import type { NoteDto } from '../../types/api';

export const getNotes = (
  signal?: AbortSignal,
): Promise<AxiosResponse<NoteDto[]>> => {
  return apiClient.get<NoteDto[]>('/notes', {
    signal,
  });
};
```

Request functions in `/api/*/requests.ts` should return the full Axios promise directly. Do not `await` inside these request functions; response mapping belongs in query hooks or callers.

Default theme configuration should be as follows:

```
import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",

    primary: {
      main: "#0070F2",
    },

    secondary: {
      main: "#0057D2",
    },

    success: {
      main: "#188918",
    },

    warning: {
      main: "#C35500",
    },

    error: {
      main: "#D20A0A",
    },

    info: {
      main: "#0070F2",
    },

    background: {
      default: "#F5F6F7",
      paper: "#FFFFFF",
    },

    text: {
      primary: "#223548",
      secondary: "#475E75",
    },

    divider: "#D5DADD",
  },
});
```

#### Rules of hooks

When placing hooks like useState, useMemo and so on, do it in following order where possible

1. useTranslation
2. useState, useRef, useTransition and custom one line hooks
3. useMemo
4. useCallback and custom multi line hooks
5. useEffect, useLayoutEffect

Where there are dependencies that can be memoized, use useCallback

### backend

Backend is using nest.js
The nest.js app should follow structure like here C:\Users\vojta\Documents\work\k8s-backend
The backend will need to be exposing swagger. Backend swagger will be used as a source of thruth for frontend when it comes to types.

#### App structure

```
/backend
  /src
    /app
      /app.module.ts
    /config
      /app.config.ts
    /constants
      index.ts (default port, global api prefix)
    /modules
      /health
        /types
          /type-name.dto.ts
        /health.module.ts
        /health.service.ts
        /health.controller.ts
      /module-name
        ...
    /main.ts
```

You can draw an inspiration from `C:\Users\vojta\Documents\work\k8s-backend`

## Type placement

Top-level `types/`, `utils/`, and `constants/` folders are allowed when the code inside them is genuinely shared across the whole application, especially when it is consumed by both backend and frontend. Examples include generated API types, cross-app contracts, or shared constants that define an application-wide protocol.

Do not create generic service-root buckets inside backend or frontend when the code belongs to one concrete domain/module/repository. Slice-local `types/`, `utils/`, and `constants/` folders are allowed when they serve one concrete slice and contain actual code owned by that slice. Do not create empty or speculative local folders.

That means:

- cross-app shared types, helper utilities, and constants can live at the app root when both backend and frontend need them
- backend-only types live inside the backend domain/module/repository they belong to, in a local `types/` folder when that clarifies the slice
- frontend-only types live inside the frontend page/component/domain they belong to, in a local `types/` folder when that clarifies the slice
- helper utility functions live near the code they belong to, in a local `utils/` folder when needed, unless they are truly cross-app shared utilities
- constants and enums live in the domain/module they belong to, in a local `constants/` folder when needed, unless they define cross-app shared behavior

## Naming Conventions

Use `kebab-case` for:

- folders
- files

### File names

Always honor a rule of component per file, one utility function per file, and one type per file.

Where component or utility function has up to three interface or types that are not more than 40 lines in length in total, keep then together with the component. Once it exceeds this limit, move them to a ./types folder adjecent to the component or function.

Styled components as long as there are not more than 3 can be together with component, once it exceeds this limit, they should be placed individually to separate files.

Utility function files should use the `.util.ts` suffix and be named after the function in kebab-case, for example `get-item-key.util.ts`.

Type files should not use suffixes such as `.interface` or `.type`. Enums should use the `{enum-name}-enum.ts` format.

Small groups of tightly related types can live in one file when splitting them would add noise instead of clarity, such as simple component-local prop/supporting types.

## Editing tools

- Do not use `apply_patch` in this repository. It is consistently blocked in the current environment.
- Use a working alternative for file edits instead, preferably PowerShell-based edits via `shell_command` such as `Set-Content` or other safe scripted file updates.
- Before overwriting a file, read the current contents first and keep the change scoped to the task at hand.

## Sub-agents

Define and use these two sub-agents from now on.

### Planning agent

Use before implementation begins and again whenever scope changes materially.

Responsibilities:

- Validates the task against AGENTS.md
- Identifies the implementation scope and calls out what is in scope vs out of scope
- Prefers incremental refactoring and the minimum structural change needed for the current task
- Does not write code

Expected output:

- A short implementation brief
- A list of constraints pulled from the repo guidance
- A concrete test checklist for the task
- Any open risks or assumptions that should be resolved before coding

### Code review agent

Use after implementation and before considering the task complete.

Responsibilities:

- Reviews the diff, not just the final file contents
- Checks whether naming, placement, ownership, and service-boundary rules from AGENTS.md are followed
- Checks for obvious anti-patterns, misplaced abstractions, overly broad refactors, and Encore/business-logic leakage
- Checks whether tests are sufficient for the behavior and edge cases introduced by the change
- Calls out any mismatch between the implemented change and the agreed implementation scope

Expected output:

- Findings first, ordered by severity
- Explicit note when no issues are found
- Residual risks or missing tests, if any

Operating rule:

- Do not skip the planning agent for non-trivial backend work
- Do not skip the code review agent after implementation

