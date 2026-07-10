import { Button, Stack, Typography } from '@mui/material'
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
import { useNoteColumnsQuery } from './hooks/use-note-columns-query'
import { useDeleteNoteMutation, useNotesQuery } from './hooks/use-notes-query'
import { useNotesSearch } from './hooks/use-notes-search'

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
  const [sortBy, setSortBy] = useState<NoteSortBy>(DEFAULT_SORT_BY)
  const [sortDirection, setSortDirection] = useState<NoteSortDirection>(
    DEFAULT_SORT_DIRECTION
  )
  const notesQuery = useNotesQuery({ sortBy, sortDirection })
  const deleteNoteMutation = useDeleteNoteMutation()
  const noteColumnsQuery = useNoteColumnsQuery()
  const generalSettingsQuery = useGeneralSettingsQuery()
  const filteredNotes = useNotesSearch(notesQuery.data, searchQuery)
  const isCardConfigurationLoading =
    noteColumnsQuery.isLoading || generalSettingsQuery.isLoading
  const hasCardConfigurationError =
    noteColumnsQuery.isError || generalSettingsQuery.isError
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
    if (!noteId || !selectedNote || !noteColumnsQuery.data || !generalSettingsQuery.data) {
      return
    }

    toggleDrawer({
      open: true,
      title: t('notes.detail.title'),
      targetPathname: `/notes/${selectedNote.id}`,
      targetPathnameRoot: '/notes',
      drawerActions: (
        <>
          <Button
            onClick={() => handleOpenNoteDialog(selectedNote)}
            size="small"
            variant="outlined"
          >
            {t('notes.detail.actions.edit')}
          </Button>
          <Button
            color="error"
            onClick={() => {
              void handleDeleteNote(selectedNote)
            }}
            size="small"
            variant="outlined"
          >
            {t('notes.detail.actions.delete')}
          </Button>
        </>
      ),
      drawerContent: (
        <NoteDetailPanel
          columns={noteColumnsQuery.data}
          generalSettings={generalSettingsQuery.data}
          note={selectedNote}
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
    navigate,
    noteColumnsQuery.data,
    noteId,
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
          searchQuery={searchQuery}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onAddNote={() => {
            handleOpenNoteDialog()
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
          noteColumnsQuery.data &&
          generalSettingsQuery.data && (
            <NoteCardList
              columns={noteColumnsQuery.data}
              generalSettings={generalSettingsQuery.data}
              notes={filteredNotes}
              onDeleteNote={handleDeleteNote}
              onEditNote={handleOpenNoteDialog}
              onOpenNoteDetail={handleOpenNoteDetail}
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
