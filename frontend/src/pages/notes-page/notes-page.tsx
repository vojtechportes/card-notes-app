import {
  Button,
  ListItemText,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { useConfirmation } from '../../components/confirmation'
import {
  SideDrawerContext,
  drawerInitialState,
} from '../../components/side-drawer'
import type { NoteDto } from '../../types/api'
import { CreateUpdateDialog } from './components/create-update-dialog/create-update-dialog'
import { NoteCardList } from './components/note-card-list/note-card-list'
import { NoteDetailPanel } from './components/note-detail-panel/note-detail-panel'
import { NotesToolbar } from './components/notes-toolbar/notes-toolbar'
import type {
  NoteSortBy,
  NoteSortDirection,
} from './components/notes-toolbar/notes-toolbar'
import { useGeneralSettingsQuery } from './hooks/use-general-settings-query'
import { useDeleteNoteMutation, useNotesQuery } from './hooks/use-notes-query'
import { useNotesSearch } from './hooks/use-notes-search'
import { useNoteTypeColumnsMapQuery } from './hooks/use-note-type-columns-map-query'
import { useLabelsQuery } from '../settings-page/hooks/use-labels-query'
import { useNoteTypesQuery } from '../settings-page/hooks/use-note-types-query'

const DEFAULT_SORT_BY: NoteSortBy = 'updatedAt'
const DEFAULT_SORT_DIRECTION: NoteSortDirection = 'desc'

export const NotesPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { noteId } = useParams<{ noteId?: string }>()
  const confirmation = useConfirmation()
  const { toggleDrawer } = useContext(SideDrawerContext)
  const [activeNote, setActiveNote] = useState<NoteDto | undefined>()
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNoteTypeIds, setSelectedNoteTypeIds] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<NoteSortBy>(DEFAULT_SORT_BY)
  const [sortDirection, setSortDirection] = useState<NoteSortDirection>(
    DEFAULT_SORT_DIRECTION
  )
  const noteTypesQuery = useNoteTypesQuery()
  const labelsQuery = useLabelsQuery()
  const notesQuery = useNotesQuery({
    noteTypeIds:
      selectedNoteTypeIds.length > 0 ? selectedNoteTypeIds : undefined,
    sortBy,
    sortDirection,
  })
  const deleteNoteMutation = useDeleteNoteMutation()
  const generalSettingsQuery = useGeneralSettingsQuery()
  const noteTypeTitleById = useMemo(() => {
    return (noteTypesQuery.data ?? []).reduce<Record<string, string>>(
      (accumulator, noteType) => {
        accumulator[noteType.id] = noteType.title
        return accumulator
      },
      {}
    )
  }, [noteTypesQuery.data])
  const filteredNotes = useNotesSearch(
    notesQuery.data,
    searchQuery,
    noteTypeTitleById,
    labelsQuery.data ?? []
  )
  const noteTypeIds = useMemo(() => {
    return [...new Set((notesQuery.data ?? []).map((note) => note.noteTypeId))]
  }, [notesQuery.data])
  const noteTypeColumnsMapQuery = useNoteTypeColumnsMapQuery(noteTypeIds)
  const isCardConfigurationLoading =
    noteTypeColumnsMapQuery.isLoading ||
    generalSettingsQuery.isLoading ||
    labelsQuery.isLoading
  const hasCardConfigurationError =
    noteTypeColumnsMapQuery.isError ||
    generalSettingsQuery.isError ||
    labelsQuery.isError
  const selectedNote = useMemo(
    () => notesQuery.data?.find((note) => note.id === noteId),
    [noteId, notesQuery.data]
  )

  const handleCloseNoteDialog = useCallback(() => {
    setActiveNote(undefined)
    setIsNoteDialogOpen(false)
  }, [])

  const handleOpenNoteDialog = useCallback((note?: NoteDto) => {
    setActiveNote(note)
    setIsNoteDialogOpen(true)
  }, [])

  const handleDeleteNote = useCallback(
    async (note: NoteDto) => {
      const isConfirmed = await confirmation.confirm({
        title: t('notes.deleteConfirmation.title'),
        description: t('notes.deleteConfirmation.description'),
        confirmLabel: t('notes.deleteConfirmation.actions.confirm'),
        variant: 'destructive',
      })

      if (!isConfirmed) {
        return
      }

      if (noteId === note.id) {
        navigate('/notes')
      }

      deleteNoteMutation.mutate(note.id)
    },
    [confirmation, deleteNoteMutation, navigate, noteId, t]
  )

  const handleOpenNoteDetail = useCallback(
    (note: NoteDto) => {
      navigate(`/notes/${note.id}`)
    },
    [navigate]
  )

  useEffect(() => {
    if (!noteId || !notesQuery.data || notesQuery.isLoading || selectedNote) {
      return
    }

    navigate('/notes', { replace: true })
  }, [navigate, noteId, notesQuery.data, notesQuery.isLoading, selectedNote])

  useEffect(() => {
    if (
      !noteId ||
      !selectedNote ||
      !generalSettingsQuery.data ||
      isCardConfigurationLoading ||
      hasCardConfigurationError ||
      !noteTypeColumnsMapQuery.data[selectedNote.noteTypeId]
    ) {
      return
    }

    toggleDrawer({
      open: true,
      title: t('notes.detail.title'),
      targetPathname: `/notes/${selectedNote.id}`,
      targetPathnameRoot: '/notes',
      drawerActions: [
        <MenuItem
          key="edit-note"
          onClick={() => {
            handleOpenNoteDialog(selectedNote)
          }}
        >
          <ListItemText>{t('notes.detail.actions.edit')}</ListItemText>
        </MenuItem>,
        <MenuItem
          key="delete-note"
          onClick={() => {
            void handleDeleteNote(selectedNote)
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemText>{t('notes.detail.actions.delete')}</ListItemText>
        </MenuItem>,
      ],
      drawerContent: (
        <NoteDetailPanel
          columns={noteTypeColumnsMapQuery.data[selectedNote.noteTypeId] ?? []}
          generalSettings={generalSettingsQuery.data}
          labels={labelsQuery.data ?? []}
          note={selectedNote}
          noteTypeColumnsById={noteTypeColumnsMapQuery.data}
          noteTypeTitle={noteTypeTitleById[selectedNote.noteTypeId]}
        />
      ),
      onClose: () => {
        navigate('/notes')
      },
      DetailContentContainerProps: {
        fullHeight: true,
      },
    })
  }, [
    generalSettingsQuery.data,
    handleDeleteNote,
    handleOpenNoteDialog,
    hasCardConfigurationError,
    isCardConfigurationLoading,
    labelsQuery.data,
    navigate,
    noteId,
    noteTypeColumnsMapQuery.data,
    noteTypeTitleById,
    selectedNote,
    t,
    toggleDrawer,
  ])

  useEffect(() => {
    if (!noteId) {
      toggleDrawer(drawerInitialState)
    }
  }, [noteId, toggleDrawer])

  return (
    <>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography component="h2" variant="h4">
            {t('notes.title')}
          </Typography>
          <Typography color="text.secondary">
            {t('notes.description')}
          </Typography>
        </Stack>

        <NotesToolbar
          isNoteTypesLoading={noteTypesQuery.isLoading}
          noteTypes={noteTypesQuery.data ?? []}
          searchQuery={searchQuery}
          selectedNoteTypeIds={selectedNoteTypeIds}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onAddNote={() => {
            handleOpenNoteDialog()
          }}
          onNoteTypeIdsChange={(noteTypeIds) => {
            setSelectedNoteTypeIds([...noteTypeIds].sort())
          }}
          onSearchQueryChange={setSearchQuery}
          onSortByChange={setSortBy}
          onSortDirectionChange={setSortDirection}
        />

        <Stack spacing={0.75}>
          <Typography color="text.secondary" variant="body2">
            {notesQuery.isLoading || isCardConfigurationLoading
              ? t('notes.status.loading')
              : t('notes.status.visibleCount', { count: filteredNotes.length })}
          </Typography>
          {notesQuery.isError && (
            <Typography color="error" variant="body2">
              {t('notes.status.loadError')}
            </Typography>
          )}
          {hasCardConfigurationError && (
            <Typography color="error" variant="body2">
              {t('notes.status.cardConfigError')}
            </Typography>
          )}
        </Stack>

        {!notesQuery.isLoading &&
          !notesQuery.isError &&
          !isCardConfigurationLoading &&
          !hasCardConfigurationError &&
          generalSettingsQuery.data && (
            <NoteCardList
              columns={[]}
              generalSettings={generalSettingsQuery.data}
              labels={labelsQuery.data ?? []}
              noteTypeColumnsById={noteTypeColumnsMapQuery.data}
              notes={filteredNotes}
              onDeleteNote={handleDeleteNote}
              onEditNote={handleOpenNoteDialog}
              onOpenNoteDetail={handleOpenNoteDetail}
              selectedNoteId={noteId}
            />
          )}
      </Stack>

      <CreateUpdateDialog
        mode={activeNote ? 'update' : 'create'}
        note={activeNote}
        open={isNoteDialogOpen}
        onClose={handleCloseNoteDialog}
      />
    </>
  )
}
