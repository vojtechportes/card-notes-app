import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined'
import { IconButton, Stack, Tooltip } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { ColumnDto } from '../../../../../types/api'

interface ColumnVisibilityActionsProps {
  column: ColumnDto
  onToggleDetailVisibility: (column: ColumnDto) => void
  onToggleListVisibility: (column: ColumnDto) => void
}

export const ColumnVisibilityActions = ({
  column,
  onToggleDetailVisibility,
  onToggleListVisibility,
}: ColumnVisibilityActionsProps) => {
  const { t } = useTranslation()
  const detailAction = column.isHiddenInDetail ? 'showInDetail' : 'hideInDetail'
  const listAction = column.isHidden ? 'showInList' : 'hideInList'

  return (
    <Stack direction="row" spacing={0.5}>
      <Tooltip title={t(`settings.columns.actions.${listAction}`)}>
        <IconButton
          aria-label={t(`settings.columns.actions.${listAction}`)}
          color={column.isHidden ? 'warning' : 'default'}
          onClick={() => onToggleListVisibility(column)}
        >
          <ViewListOutlinedIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title={t(`settings.columns.actions.${detailAction}`)}>
        <IconButton
          aria-label={t(`settings.columns.actions.${detailAction}`)}
          color={column.isHiddenInDetail ? 'warning' : 'default'}
          onClick={() => onToggleDetailVisibility(column)}
        >
          <DescriptionOutlinedIcon />
        </IconButton>
      </Tooltip>
    </Stack>
  )
}
