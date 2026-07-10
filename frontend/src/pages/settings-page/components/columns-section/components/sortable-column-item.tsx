import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import {
  Box,
  Chip,
  IconButton,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import { useTranslation } from 'react-i18next'
import type { ColumnDto } from '../../../../../types/api'

interface SortableColumnItemProps {
  column: ColumnDto
  onDelete: (column: ColumnDto) => void
  onEdit: (column: ColumnDto) => void
  onToggleHidden: (column: ColumnDto) => void
}

export const SortableColumnItem = ({
  column,
  onDelete,
  onEdit,
  onToggleHidden,
}: SortableColumnItemProps) => {
  const { t } = useTranslation()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id })

  return (
    <ListItem
      ref={setNodeRef}
      sx={{
        alignItems: 'flex-start',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        mb: 1.5,
        opacity: isDragging ? 0.6 : 1,
        pl: 1,
        pr: 14,
        py: 1.5,
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <Tooltip title={t('settings.columns.actions.reorder')}>
        <IconButton
          aria-label={t('settings.columns.actions.reorder')}
          edge="start"
          size="small"
          sx={{ cursor: isDragging ? 'grabbing' : 'grab', mr: 1, mt: 0.25 }}
          {...attributes}
          {...listeners}
        >
          <DragIndicatorIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <ListItemText
        primary={
          <Stack alignItems="center" direction="row" flexWrap="wrap" gap={1}>
            <Typography component="span" fontWeight={600}>
              {column.title}
            </Typography>
            <Chip
              label={t(`settings.columns.types.${column.type}`)}
              size="small"
              variant="outlined"
            />
            {column.isDefault ? (
              <Chip
                color="info"
                label={t('settings.columns.status.default')}
                size="small"
                variant="outlined"
              />
            ) : null}
            {column.isHidden ? (
              <Chip
                color="warning"
                label={t('settings.columns.status.hidden')}
                size="small"
                variant="outlined"
              />
            ) : null}
          </Stack>
        }
        secondary={
          <Box component="span" sx={{ display: 'block', mt: 0.75 }}>
            <Typography component="span" display="block" variant="body2">
              {t('settings.columns.labels.name', { name: column.name })}
            </Typography>
            <Typography
              color="text.secondary"
              component="span"
              display="block"
              variant="body2"
            >
              {column.isDefault
                ? t('settings.columns.hints.defaultColumn')
                : t('settings.columns.hints.customColumn')}
            </Typography>
          </Box>
        }
      />

      <ListItemSecondaryAction>
        <Stack direction="row" spacing={0.5}>
          <Tooltip
            title={
              column.isHidden
                ? t('settings.columns.actions.show')
                : t('settings.columns.actions.hide')
            }
          >
            <IconButton
              aria-label={
                column.isHidden
                  ? t('settings.columns.actions.show')
                  : t('settings.columns.actions.hide')
              }
              onClick={() => onToggleHidden(column)}
            >
              {column.isHidden ? (
                <VisibilityOutlinedIcon />
              ) : (
                <VisibilityOffOutlinedIcon />
              )}
            </IconButton>
          </Tooltip>
          <Tooltip title={t('settings.columns.actions.edit')}>
            <IconButton
              aria-label={t('settings.columns.actions.edit')}
              onClick={() => onEdit(column)}
            >
              <EditOutlinedIcon />
            </IconButton>
          </Tooltip>
          {!column.isDefault ? (
            <Tooltip title={t('settings.columns.actions.delete')}>
              <IconButton
                aria-label={t('settings.columns.actions.delete')}
                color="error"
                onClick={() => onDelete(column)}
              >
                <DeleteOutlineIcon />
              </IconButton>
            </Tooltip>
          ) : null}
        </Stack>
      </ListItemSecondaryAction>
    </ListItem>
  )
}
