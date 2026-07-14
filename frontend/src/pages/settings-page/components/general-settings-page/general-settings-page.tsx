import { Stack } from '@mui/material'
import { GeneralSection } from '../general-section/general-section'
import { UpdaterSection } from '../updater-section/updater-section'

export const GeneralSettingsPage = () => {
  return (
    <Stack spacing={3}>
      <GeneralSection />
      <UpdaterSection />
    </Stack>
  )
}
