import { Stack } from '@mui/material'
import { Navigate, Route, Routes } from 'react-router-dom'
import { DataManagementSettingsPage } from './components/data-management-settings-page/data-management-settings-page'
import { ExportImportSettingsPage } from './components/export-import-settings-page/export-import-settings-page'
import { GeneralSettingsPage } from './components/general-settings-page/general-settings-page'
import { LegacyNoteTypeSettingsRedirect } from './components/legacy-note-type-settings-redirect/legacy-note-type-settings-redirect'
import { NoteTemplatesSettingsPage } from './components/note-templates-settings-page/note-templates-settings-page'
import { settingsSubPageRoutes } from './constants/settings-sub-page-routes'

export const SettingsPage = () => {
  return (
    <Stack spacing={3}>
      <Routes>
        <Route
          index
          element={<Navigate to={settingsSubPageRoutes.general} replace />}
        />
        <Route
          path={settingsSubPageRoutes.general}
          element={<GeneralSettingsPage />}
        />
        <Route
          path={settingsSubPageRoutes.noteTemplates}
          element={<NoteTemplatesSettingsPage />}
        />
        <Route
          path={`${settingsSubPageRoutes.noteTemplates}/:noteTypeId`}
          element={<NoteTemplatesSettingsPage />}
        />
        <Route
          path={settingsSubPageRoutes.exportImport}
          element={<ExportImportSettingsPage />}
        />
        <Route
          path={settingsSubPageRoutes.dataManagement}
          element={<DataManagementSettingsPage />}
        />
        <Route
          path=":noteTypeId"
          element={<LegacyNoteTypeSettingsRedirect />}
        />
        <Route
          path="*"
          element={<Navigate to={settingsSubPageRoutes.general} replace />}
        />
      </Routes>
    </Stack>
  )
}
