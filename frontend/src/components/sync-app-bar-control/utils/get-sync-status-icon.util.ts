import CloudDoneOutlinedIcon from '@mui/icons-material/CloudDoneOutlined'
import CloudOffOutlinedIcon from '@mui/icons-material/CloudOffOutlined'
import SyncOutlinedIcon from '@mui/icons-material/SyncOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import type { SvgIconComponent } from '@mui/icons-material'

export const getSyncStatusIcon = (state: string): SvgIconComponent => {
  if (state === 'offline' || state === 'error') {
    return CloudOffOutlinedIcon
  }
  if (state === 'attention-required') {
    return WarningAmberOutlinedIcon
  }
  if (state === 'synced') {
    return CloudDoneOutlinedIcon
  }

  return SyncOutlinedIcon
}
