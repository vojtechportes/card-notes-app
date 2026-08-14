import { Box, Container, useMediaQuery } from '@mui/material'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { windowTitleBarHeight } from '../../../../constants/window-title-bar'
import { mediumDownMediaQuery, mediumUpMediaQuery } from '../../../../theme'
import type { LabelDto, NoteTypeDto } from '../../../../types/api'
import type { LabelMatchMode } from '../../types/label-match-mode'
import type { NotesViewMode } from '../../types/notes-view-mode'
import { AdvancedFilterPopover } from './components/advanced-filter-popover'
import { NotesSearchField } from './components/notes-search-field'
import { NotesToolbarActions } from './components/notes-toolbar-actions'
import type { NoteSortBy } from './types/note-sort-by'
import type { NoteSortDirection } from './types/note-sort-direction'

export type { NoteSortBy } from './types/note-sort-by'
export type { NoteSortDirection } from './types/note-sort-direction'

interface NotesToolbarProps {
  isLabelsLoading: boolean
  isNoteTypesLoading: boolean
  labelMatchMode: LabelMatchMode
  labels: LabelDto[]
  noteTypes: NoteTypeDto[]
  searchQuery: string
  selectedLabelIds: string[]
  selectedNoteTypeIds: string[]
  sortBy: NoteSortBy
  sortDirection: NoteSortDirection
  viewMode: NotesViewMode
  onAddNote: () => void
  onClearFilters: () => void
  onLabelIdsChange: (labelIds: string[]) => void
  onLabelMatchModeChange: (matchMode: LabelMatchMode) => void
  onNoteTypeIdsChange: (noteTypeIds: string[]) => void
  onSearchQueryChange: (searchQuery: string) => void
  onSortByChange: (sortBy: NoteSortBy) => void
  onSortDirectionChange: (sortDirection: NoteSortDirection) => void
}

interface ToolbarMetrics {
  mainLeft: number
  mainWidth: number | null
  shellHeight: number | null
}

const defaultToolbarMetrics: ToolbarMetrics = {
  mainLeft: 0,
  mainWidth: null,
  shellHeight: null,
}

export const NotesToolbar = ({
  isLabelsLoading,
  isNoteTypesLoading,
  labelMatchMode,
  labels,
  noteTypes,
  searchQuery,
  selectedLabelIds,
  selectedNoteTypeIds,
  sortBy,
  sortDirection,
  viewMode,
  onAddNote,
  onClearFilters,
  onLabelIdsChange,
  onLabelMatchModeChange,
  onNoteTypeIdsChange,
  onSearchQueryChange,
  onSortByChange,
  onSortDirectionChange,
}: NotesToolbarProps) => {
  const { t } = useTranslation()
  const isMediumDown = useMediaQuery(mediumDownMediaQuery)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null)
  const [isSticky, setIsSticky] = useState(false)
  const [toolbarMetrics, setToolbarMetrics] = useState<ToolbarMetrics>(
    defaultToolbarMetrics
  )

  const clearableFilterCount =
    selectedLabelIds.length +
    (viewMode === 'card' ? selectedNoteTypeIds.length : 0)
  const filterButtonLabel =
    clearableFilterCount > 0
      ? t('notes.toolbar.filters.buttonWithCount', {
          count: clearableFilterCount,
        })
      : t('notes.toolbar.filters.button')
  const isCompactSticky = isSticky && isMediumDown

  const updateToolbarMetrics = useCallback(() => {
    if (!wrapperRef.current) {
      return
    }

    const mainElement = wrapperRef.current.closest('main')

    if (!(mainElement instanceof HTMLElement)) {
      return
    }

    const mainRect = mainElement.getBoundingClientRect()
    const wrapperRect = wrapperRef.current.getBoundingClientRect()
    const scrollbarWidth = Math.max(
      0,
      mainElement.offsetWidth - mainElement.clientWidth
    )
    const mainWidth = Math.max(0, mainRect.width - scrollbarWidth)

    setToolbarMetrics({
      mainLeft: mainRect.left,
      mainWidth: mainWidth || null,
      shellHeight: wrapperRect.height || null,
    })
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSticky(!entry.isIntersecting)
      },
      {
        threshold: 0,
      }
    )

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current)
    }

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    updateToolbarMetrics()

    const resizeObserver = new ResizeObserver(() => {
      updateToolbarMetrics()
    })
    const mainElement = wrapperRef.current?.closest('main')

    if (wrapperRef.current) {
      resizeObserver.observe(wrapperRef.current)
    }

    if (mainElement) {
      resizeObserver.observe(mainElement)
    }

    window.addEventListener('resize', updateToolbarMetrics)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateToolbarMetrics)
    }
  }, [updateToolbarMetrics])

  useEffect(() => {
    if (isCompactSticky) {
      setFilterAnchorEl(null)
    }
  }, [isCompactSticky])

  return (
    <>
      <div ref={sentinelRef} />

      <Box
        ref={wrapperRef}
        sx={{
          height:
            isSticky && toolbarMetrics.shellHeight
              ? `${toolbarMetrics.shellHeight}px`
              : 'auto',
        }}
      >
        <Box
          data-testid="notes-toolbar-shell"
          sx={{
            position: isSticky ? 'fixed' : 'relative',
            top: isSticky
              ? {
                  xs: `calc(56px + ${windowTitleBarHeight}px)`,
                  sm: `calc(64px + ${windowTitleBarHeight}px)`,
                }
              : 'auto',
            left: isSticky ? `${toolbarMetrics.mainLeft}px` : 'auto',
            width:
              isSticky && toolbarMetrics.mainWidth
                ? `${toolbarMetrics.mainWidth}px`
                : '100%',
            zIndex: isSticky
              ? (muiTheme) => muiTheme.zIndex.appBar - 1
              : 'auto',
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            ...(isSticky && {
              borderRadius: 0,
              borderLeft: 0,
              borderRight: 0,
              boxShadow: (muiTheme) => muiTheme.shadows[1],
            }),
          }}
        >
          <Container
            maxWidth="xl"
            disableGutters={!isSticky}
            data-testid="notes-toolbar-content"
            sx={isSticky ? { py: 2 } : { p: 2 }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: isCompactSticky
                  ? { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) auto' }
                  : 'minmax(0, 1fr)',
                gap: 1.5,
                alignItems: isCompactSticky
                  ? { xs: 'stretch', sm: 'center' }
                  : 'stretch',
                ...(!isCompactSticky && {
                  [mediumUpMediaQuery]: {
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    alignItems: 'center',
                  },
                }),
              }}
            >
              <NotesSearchField
                label={t('notes.toolbar.search.label')}
                placeholder={t('notes.toolbar.search.placeholder')}
                searchQuery={searchQuery}
                onSearchQueryChange={onSearchQueryChange}
              />

              <NotesToolbarActions
                filterButtonLabel={filterButtonLabel}
                isCompactSticky={isCompactSticky}
                sortBy={sortBy}
                sortDirection={sortDirection}
                t={t}
                onAddNote={onAddNote}
                onFilterClick={setFilterAnchorEl}
                onSortByChange={onSortByChange}
                onSortDirectionChange={onSortDirectionChange}
              />
            </Box>
          </Container>
        </Box>
      </Box>

      <AdvancedFilterPopover
        anchorEl={filterAnchorEl}
        isLabelsLoading={isLabelsLoading}
        isNoteTypesLoading={isNoteTypesLoading}
        labelMatchMode={labelMatchMode}
        labels={labels}
        noteTypes={noteTypes}
        open={Boolean(filterAnchorEl)}
        selectedLabelIds={selectedLabelIds}
        selectedNoteTypeIds={selectedNoteTypeIds}
        viewMode={viewMode}
        onClearFilters={onClearFilters}
        onClose={() => setFilterAnchorEl(null)}
        onLabelIdsChange={onLabelIdsChange}
        onLabelMatchModeChange={onLabelMatchModeChange}
        onNoteTypeIdsChange={onNoteTypeIdsChange}
      />
    </>
  )
}
