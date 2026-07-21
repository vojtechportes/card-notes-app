import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { IconButton, Stack, Tooltip } from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { LabelChip } from '../../../../../components/label-chip/label-chip'
import type { LabelDto, NoteTypeDto } from '../../../../../types/api'
import { formatSettingsDate } from '../../../utils/format-settings-date.util'

interface LabelsGridProps {
  labels: LabelDto[]
  noteTypes: NoteTypeDto[]
  onDelete: (label: LabelDto) => void
  onEdit: (label: LabelDto) => void
}

type LabelGridRow = LabelDto & {
  createdAtLabel: string
  noteTypeTitle: string
  updatedAtLabel: string
}

export const LabelsGrid = ({
  labels,
  noteTypes,
  onDelete,
  onEdit,
}: LabelsGridProps) => {
  const { t } = useTranslation()

  const rows = useMemo<LabelGridRow[]>(() => {
    const noteTypeTitles = new Map(
      noteTypes.map((noteType) => [noteType.id, noteType.title])
    )

    return labels.map((label) => ({
      ...label,
      createdAtLabel: formatSettingsDate(label.createdAt),
      noteTypeTitle: label.noteTypeId
        ? (noteTypeTitles.get(label.noteTypeId) ??
          t('settings.noteLabels.sources.missing'))
        : t('settings.noteLabels.sources.shared'),
      updatedAtLabel: formatSettingsDate(label.updatedAt),
    }))
  }, [labels, noteTypes, t])

  const columns = useMemo<GridColDef<LabelGridRow>[]>(() => {
    return [
      {
        field: 'title',
        flex: 1,
        headerName: t('settings.noteLabels.grid.columns.title'),
        minWidth: 180,
        renderCell: ({ row }) => (
          <Stack alignItems="center" direction="row" sx={{ height: '100%' }}>
            <LabelChip color={row.color} title={row.title} />
          </Stack>
        ),
      },
      {
        field: 'name',
        flex: 0.8,
        headerName: t('settings.noteLabels.grid.columns.name'),
        minWidth: 150,
      },
      {
        field: 'noteTypeTitle',
        flex: 0.9,
        headerName: t('settings.noteLabels.grid.columns.noteTemplate'),
        minWidth: 170,
      },
      {
        field: 'createdAtLabel',
        flex: 0.8,
        headerName: t('settings.noteLabels.grid.columns.createdAt'),
        minWidth: 180,
        sortable: false,
      },
      {
        field: 'updatedAtLabel',
        flex: 0.8,
        headerName: t('settings.noteLabels.grid.columns.updatedAt'),
        minWidth: 180,
        sortable: false,
      },
      {
        align: 'right',
        field: 'actions',
        filterable: false,
        headerAlign: 'right',
        headerName: t('settings.noteLabels.grid.columns.actions'),
        minWidth: 120,
        sortable: false,
        renderCell: ({ row }) => (
          <Stack
            alignItems="center"
            direction="row"
            justifyContent="flex-end"
            spacing={0.5}
            sx={{ height: '100%', width: '100%' }}
          >
            <Tooltip title={t('settings.noteLabels.actions.edit')}>
              <IconButton
                aria-label={t('settings.noteLabels.actions.edit')}
                onClick={(event) => {
                  event.stopPropagation()
                  onEdit(row)
                }}
                size="small"
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('settings.noteLabels.actions.delete')}>
              <IconButton
                aria-label={t('settings.noteLabels.actions.delete')}
                onClick={(event) => {
                  event.stopPropagation()
                  onDelete(row)
                }}
                size="small"
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ]
  }, [onDelete, onEdit, t])

  return (
    <DataGrid
      autoHeight
      columns={columns}
      disableColumnMenu
      disableRowSelectionOnClick
      disableVirtualization
      hideFooter
      rows={rows}
    />
  )
}
