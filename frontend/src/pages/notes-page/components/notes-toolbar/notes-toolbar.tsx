import AddIcon from '@mui/icons-material/Add'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import FilterListIcon from '@mui/icons-material/FilterList'
import SearchIcon from '@mui/icons-material/Search'
import {
  Box,
  Button,
  FormControl,
  InputAdornment,
  InputLabel,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { windowTitleBarHeight } from '../../../../constants/window-title-bar'
import type {
  LabelDto,
  ListNotesQueryDto,
  NoteTypeDto,
} from '../../../../types/api'
import type { LabelMatchMode } from '../../types/label-match-mode'
import { AdvancedFilterPopover } from './components/advanced-filter-popover'

export type NoteSortBy = NonNullable<ListNotesQueryDto['sortBy']>
export type NoteSortDirection = NonNullable<ListNotesQueryDto['sortDirection']>

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
  onAddNote: () => void
  onLabelIdsChange: (labelIds: string[]) => void
  onLabelMatchModeChange: (matchMode: LabelMatchMode) => void
  onNoteTypeIdsChange: (noteTypeIds: string[]) => void
  onSearchQueryChange: (searchQuery: string) => void
  onSortByChange: (sortBy: NoteSortBy) => void
  onSortDirectionChange: (sortDirection: NoteSortDirection) => void
}

interface ToolbarMetrics {
  contentWidth: number | null
  mainLeft: number
  mainWidth: number | null
  shellHeight: number | null
}

const defaultToolbarMetrics: ToolbarMetrics = {
  contentWidth: null,
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
  onAddNote,
  onLabelIdsChange,
  onLabelMatchModeChange,
  onNoteTypeIdsChange,
  onSearchQueryChange,
  onSortByChange,
  onSortDirectionChange,
}: NotesToolbarProps) => {
  const { t } = useTranslation()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null)
  const [isSticky, setIsSticky] = useState(false)
  const [toolbarMetrics, setToolbarMetrics] = useState<ToolbarMetrics>(
    defaultToolbarMetrics
  )

  const activeFilterCount = selectedLabelIds.length + selectedNoteTypeIds.length
  const filterButtonLabel =
    activeFilterCount > 0
      ? t('notes.toolbar.filters.buttonWithCount', {
          count: activeFilterCount,
        })
      : t('notes.toolbar.filters.button')

  const updateToolbarMetrics = useCallback(() => {
    if (!wrapperRef.current || !shellRef.current || !contentRef.current) {
      return
    }

    const mainElement = wrapperRef.current.closest('main')

    if (!(mainElement instanceof HTMLElement)) {
      return
    }

    const mainRect = mainElement.getBoundingClientRect()
    const contentRect = contentRef.current.getBoundingClientRect()
    const shellRect = shellRef.current.getBoundingClientRect()

    setToolbarMetrics({
      contentWidth: contentRect.width,
      mainLeft: mainRect.left,
      mainWidth: mainRect.width,
      shellHeight: shellRect.height,
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

    if (wrapperRef.current) {
      resizeObserver.observe(wrapperRef.current)
    }

    if (shellRef.current) {
      resizeObserver.observe(shellRef.current)
    }

    window.addEventListener('resize', updateToolbarMetrics)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateToolbarMetrics)
    }
  }, [updateToolbarMetrics])

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
          ref={shellRef}
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
            zIndex: isSticky ? (theme) => theme.zIndex.appBar - 1 : 'auto',
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            ...(isSticky && {
              borderRadius: 0,
              borderLeft: 0,
              borderRight: 0,
              boxShadow: (theme) => theme.shadows[1],
            }),
          }}
        >
          <Box
            ref={contentRef}
            sx={{
              p: 2,
              ...(isSticky && {
                boxSizing: 'border-box',
                width: toolbarMetrics.contentWidth
                  ? `${toolbarMetrics.contentWidth}px`
                  : '100%',
                maxWidth: '100%',
                mx: 'auto',
              }),
            }}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              sx={{ alignItems: { xs: 'stretch', md: 'center' } }}
            >
              <TextField
                fullWidth
                label={t('notes.toolbar.search.label')}
                placeholder={t('notes.toolbar.search.placeholder')}
                size="small"
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  flex: { md: '1 1 auto' },
                  minWidth: 0,
                }}
              />

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                sx={{
                  alignItems: { xs: 'stretch', sm: 'center' },
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                <FormControl
                  size="small"
                  sx={{ minWidth: { xs: '100%', sm: 180 } }}
                >
                  <InputLabel htmlFor="notes-sort-by">
                    {t('notes.toolbar.sortBy.label')}
                  </InputLabel>

                  <Select
                    native
                    label={t('notes.toolbar.sortBy.label')}
                    value={sortBy}
                    onChange={(event) =>
                      onSortByChange(event.target.value as NoteSortBy)
                    }
                    inputProps={{ id: 'notes-sort-by' }}
                  >
                    <option value="createdAt">
                      {t('notes.toolbar.sortBy.options.createdAt')}
                    </option>
                    <option value="updatedAt">
                      {t('notes.toolbar.sortBy.options.updatedAt')}
                    </option>
                  </Select>
                </FormControl>

                <ToggleButtonGroup
                  exclusive
                  aria-label={t('notes.toolbar.sortDirection.label')}
                  size="small"
                  value={sortDirection}
                  onChange={(_, value: NoteSortDirection | null) => {
                    if (value) {
                      onSortDirectionChange(value)
                    }
                  }}
                >
                  <ToggleButton
                    aria-label={t('notes.toolbar.sortDirection.options.asc')}
                    value="asc"
                  >
                    <ArrowUpwardIcon fontSize="small" />
                  </ToggleButton>

                  <ToggleButton
                    aria-label={t('notes.toolbar.sortDirection.options.desc')}
                    value="desc"
                  >
                    <ArrowDownwardIcon fontSize="small" />
                  </ToggleButton>
                </ToggleButtonGroup>

                <Button
                  startIcon={<FilterListIcon />}
                  variant="outlined"
                  onClick={(event) => setFilterAnchorEl(event.currentTarget)}
                >
                  {filterButtonLabel}
                </Button>

                <Button
                  startIcon={<AddIcon />}
                  variant="contained"
                  onClick={onAddNote}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  {t('notes.toolbar.actions.add')}
                </Button>
              </Stack>
            </Stack>
          </Box>
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
        onClose={() => setFilterAnchorEl(null)}
        onLabelIdsChange={onLabelIdsChange}
        onLabelMatchModeChange={onLabelMatchModeChange}
        onNoteTypeIdsChange={onNoteTypeIdsChange}
      />
    </>
  )
}
