import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import {
  Alert,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  SideDrawerContext,
  drawerInitialState,
} from '../../../../components/side-drawer'
import type { DeleteNoteTypeDto, NoteTypeDto } from '../../../../types/api'
import { useCreateNoteTypeMutation } from '../../hooks/use-create-note-type-mutation'
import { useDeleteNoteTypeMutation } from '../../hooks/use-delete-note-type-mutation'
import { useNoteTypeDetailQuery } from '../../hooks/use-note-type-detail-query'
import { useNoteTypesQuery } from '../../hooks/use-note-types-query'
import { useUpdateNoteTypeMutation } from '../../hooks/use-update-note-type-mutation'
import { settingsSubPageRoutes } from '../../constants/settings-sub-page-routes'
import { SettingsSection } from '../settings-section'
import { DeleteNoteTypeDialog } from './delete-note-type-dialog'
import { NoteTypeDetailPanel } from './note-type-detail-panel'
import { NoteTypeDialog } from './note-type-dialog'
import { formatSettingsDate } from './utils/format-settings-date.util'

const noteTemplatesSettingsPath = `/settings/${settingsSubPageRoutes.noteTemplates}`

type NoteTypeDialogState =
  | {
      mode: 'create'
      noteType?: undefined
    }
  | {
      mode: 'edit'
      noteType: NoteTypeDto
    }

export const NoteTypesSection = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { noteTypeId } = useParams<{ noteTypeId?: string }>()
  const { toggleDrawer } = useContext(SideDrawerContext)
  const [dialogState, setDialogState] = useState<NoteTypeDialogState | null>(
    null
  )
  const [deleteCandidate, setDeleteCandidate] = useState<NoteTypeDto | null>(
    null
  )
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const noteTypesQuery = useNoteTypesQuery()
  const createNoteTypeMutation = useCreateNoteTypeMutation()
  const updateNoteTypeMutation = useUpdateNoteTypeMutation()
  const deleteNoteTypeMutation = useDeleteNoteTypeMutation()
  const noteTypeDetailQuery = useNoteTypeDetailQuery(noteTypeId)

  const noteTypes = noteTypesQuery.data ?? []
  const activeNoteType = useMemo(() => {
    return noteTypes.find((noteType) => noteType.id === noteTypeId) ?? null
  }, [noteTypeId, noteTypes])

  const rows = useMemo(() => {
    return noteTypes.map((noteType) => ({
      ...noteType,
      createdAtLabel: formatSettingsDate(noteType.createdAt),
      updatedAtLabel: formatSettingsDate(noteType.updatedAt),
    }))
  }, [noteTypes])

  const closeDrawer = useCallback(() => {
    navigate(noteTemplatesSettingsPath)
  }, [navigate])

  const handleOpenCreateDialog = useCallback(() => {
    setDialogError(null)
    setDialogState({ mode: 'create' })
  }, [])

  const handleOpenEditDialog = useCallback((noteType: NoteTypeDto) => {
    setDialogError(null)
    setDialogState({ mode: 'edit', noteType })
  }, [])

  const handleCloseDialog = useCallback(() => {
    setDialogState(null)
    setDialogError(null)
  }, [])

  const handleCloseDeleteDialog = useCallback(() => {
    setDeleteCandidate(null)
    setDeleteError(null)
  }, [])

  const handleDialogSubmit = useCallback(
    async (values: { title: string }) => {
      try {
        if (dialogState?.mode === 'edit') {
          await updateNoteTypeMutation.mutateAsync({
            id: dialogState.noteType.id,
            noteType: {
              title: values.title.trim(),
            },
          })
        } else {
          const createdNoteType = await createNoteTypeMutation.mutateAsync({
            title: values.title.trim(),
          })

          navigate(`${noteTemplatesSettingsPath}/${createdNoteType.id}`)
        }

        handleCloseDialog()
      } catch {
        setDialogError(t('settings.noteTypes.errors.submit'))
      }
    },
    [
      createNoteTypeMutation,
      dialogState,
      handleCloseDialog,
      navigate,
      t,
      updateNoteTypeMutation,
    ]
  )

  const handleDeleteSubmit = useCallback(
    async (payload: DeleteNoteTypeDto) => {
      if (!deleteCandidate) {
        return
      }

      try {
        await deleteNoteTypeMutation.mutateAsync({
          id: deleteCandidate.id,
          noteType: payload,
        })
        if (noteTypeId === deleteCandidate.id) {
          closeDrawer()
        }
        handleCloseDeleteDialog()
      } catch {
        setDeleteError(t('settings.noteTypes.errors.delete'))
      }
    },
    [
      closeDrawer,
      deleteCandidate,
      deleteNoteTypeMutation,
      handleCloseDeleteDialog,
      noteTypeId,
      t,
    ]
  )

  const handleOpenNoteTypeDetail = useCallback(
    (id: string) => {
      navigate(`${noteTemplatesSettingsPath}/${id}`)
    },
    [navigate]
  )

  const gridColumns = useMemo<GridColDef[]>(() => {
    return [
      {
        field: 'title',
        flex: 1.2,
        headerName: t('settings.noteTypes.grid.columns.name'),
        minWidth: 220,
      },
      {
        field: 'createdAtLabel',
        flex: 0.8,
        headerName: t('settings.noteTypes.grid.columns.createdAt'),
        minWidth: 180,
        sortable: false,
      },
      {
        field: 'updatedAtLabel',
        flex: 0.8,
        headerName: t('settings.noteTypes.grid.columns.updatedAt'),
        minWidth: 180,
        sortable: false,
      },
      {
        field: 'actions',
        headerName: t('settings.noteTypes.grid.columns.actions'),
        minWidth: 120,
        sortable: false,
        filterable: false,
        align: 'right',
        headerAlign: 'right',
        renderCell: (params) => {
          const row = params.row as NoteTypeDto

          return (
            <Stack
              alignItems="center"
              direction="row"
              justifyContent="flex-end"
              spacing={0.5}
              sx={{ height: '100%', width: '100%' }}
            >
              <Tooltip title={t('settings.noteTypes.actions.edit')}>
                <IconButton
                  aria-label={t('settings.noteTypes.actions.edit')}
                  onClick={(event) => {
                    event.stopPropagation()
                    handleOpenEditDialog(row)
                  }}
                  size="small"
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('settings.noteTypes.actions.delete')}>
                <IconButton
                  aria-label={t('settings.noteTypes.actions.delete')}
                  onClick={(event) => {
                    event.stopPropagation()
                    setDeleteError(null)
                    setDeleteCandidate(row)
                  }}
                  size="small"
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          )
        },
      },
    ]
  }, [handleOpenEditDialog, t])

  useEffect(() => {
    if (
      !noteTypeId ||
      noteTypesQuery.isLoading ||
      noteTypesQuery.isError ||
      activeNoteType
    ) {
      return
    }

    navigate(noteTemplatesSettingsPath, { replace: true })
  }, [
    activeNoteType,
    navigate,
    noteTypeId,
    noteTypesQuery.isError,
    noteTypesQuery.isLoading,
  ])

  useEffect(() => {
    if (!noteTypeId || (!activeNoteType && !noteTypesQuery.isLoading)) {
      toggleDrawer(drawerInitialState)
      return
    }

    toggleDrawer({
      open: true,
      title:
        noteTypeDetailQuery.data?.title ??
        activeNoteType?.title ??
        t('settings.noteTypes.drawer.title'),
      targetPathname: `${noteTemplatesSettingsPath}/${noteTypeId}`,
      targetPathnameRoot: noteTemplatesSettingsPath,
      loading: noteTypeDetailQuery.isLoading,
      drawerContent: (
        <NoteTypeDetailPanel
          isError={noteTypeDetailQuery.isError}
          isLoading={noteTypeDetailQuery.isLoading}
          noteType={noteTypeDetailQuery.data}
          noteTypeId={noteTypeId}
        />
      ),
      onClose: closeDrawer,
      width: 640,
    })
  }, [
    activeNoteType,
    closeDrawer,
    noteTypeDetailQuery.data,
    noteTypeDetailQuery.isError,
    noteTypeDetailQuery.isLoading,
    noteTypeId,
    noteTypesQuery.isLoading,
    t,
    toggleDrawer,
  ])

  return (
    <>
      <SettingsSection>
        <Stack spacing={2}>
          <Stack
            alignItems={{ sm: 'center', xs: 'stretch' }}
            direction={{ sm: 'row', xs: 'column' }}
            justifyContent="space-between"
            spacing={2}
          >
            <Typography color="text.secondary">
              {t('settings.noteTypes.summary', { count: noteTypes.length })}
            </Typography>
            <Button
              onClick={handleOpenCreateDialog}
              startIcon={<AddIcon />}
              variant="contained"
            >
              {t('settings.noteTypes.actions.add')}
            </Button>
          </Stack>

          {noteTypesQuery.isLoading ? (
            <Stack alignItems="center" direction="row" spacing={1.5}>
              <CircularProgress size={20} />
              <Typography color="text.secondary">
                {t('settings.noteTypes.status.loading')}
              </Typography>
            </Stack>
          ) : noteTypesQuery.isError ? (
            <Alert severity="error">
              {t('settings.noteTypes.status.error')}
            </Alert>
          ) : noteTypes.length === 0 ? (
            <Alert severity="info">
              {t('settings.noteTypes.status.empty')}
            </Alert>
          ) : (
            <DataGrid
              autoHeight
              columns={gridColumns}
              disableColumnMenu
              disableRowSelectionOnClick
              disableVirtualization
              hideFooter
              onRowClick={(params) => {
                handleOpenNoteTypeDetail(String(params.id))
              }}
              rows={rows}
              sx={{
                '& .MuiDataGrid-cell': {
                  cursor: 'pointer',
                },
                '& .MuiDataGrid-cell[data-field="actions"]': {
                  alignItems: 'center',
                },
              }}
            />
          )}
        </Stack>
      </SettingsSection>

      <NoteTypeDialog
        isPending={
          createNoteTypeMutation.isPending || updateNoteTypeMutation.isPending
        }
        noteType={
          dialogState?.mode === 'edit' ? dialogState.noteType : undefined
        }
        onClose={handleCloseDialog}
        onSubmit={handleDialogSubmit}
        open={Boolean(dialogState)}
        submitError={dialogError}
      />

      <DeleteNoteTypeDialog
        isPending={deleteNoteTypeMutation.isPending}
        noteType={deleteCandidate}
        noteTypes={noteTypes}
        onClose={handleCloseDeleteDialog}
        onSubmit={handleDeleteSubmit}
        open={Boolean(deleteCandidate)}
        submitError={deleteError}
      />
    </>
  )
}
