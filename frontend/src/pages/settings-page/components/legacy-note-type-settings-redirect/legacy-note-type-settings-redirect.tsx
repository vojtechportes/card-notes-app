import { Navigate, useParams } from 'react-router-dom'
import { settingsSubPageRoutes } from '../../constants/settings-sub-page-routes'

export const LegacyNoteTypeSettingsRedirect = () => {
  const { noteTypeId } = useParams<{ noteTypeId: string }>()

  return (
    <Navigate
      to={`/settings/${settingsSubPageRoutes.noteTemplates}/${noteTypeId ?? ''}`}
      replace
    />
  )
}
