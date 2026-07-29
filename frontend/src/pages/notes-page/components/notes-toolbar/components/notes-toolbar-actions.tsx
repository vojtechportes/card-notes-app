import AddIcon from '@mui/icons-material/Add'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import FilterListIcon from '@mui/icons-material/FilterList'
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import type { TFunction } from 'i18next'
import { mediumUpMediaQuery } from '../../../../../theme'
import type { NoteSortBy } from '../types/note-sort-by'
import type { NoteSortDirection } from '../types/note-sort-direction'

interface NotesToolbarActionsProps {
  filterButtonLabel: string
  isCompactSticky: boolean
  sortBy: NoteSortBy
  sortDirection: NoteSortDirection
  t: TFunction
  onAddNote: () => void
  onFilterClick: (anchorElement: HTMLElement) => void
  onSortByChange: (sortBy: NoteSortBy) => void
  onSortDirectionChange: (sortDirection: NoteSortDirection) => void
}

export const NotesToolbarActions = ({
  filterButtonLabel,
  isCompactSticky,
  sortBy,
  sortDirection,
  t,
  onAddNote,
  onFilterClick,
  onSortByChange,
  onSortDirectionChange,
}: NotesToolbarActionsProps) => {
  return (
    <Box
      data-testid="notes-toolbar-actions"
      sx={{
        display: 'grid',
        gridTemplateColumns: isCompactSticky
          ? { xs: 'minmax(0, 1fr)', sm: 'auto' }
          : {
              xs: 'minmax(0, 1fr) auto',
              sm: 'minmax(180px, 1fr) auto auto auto',
            },
        gap: 1.5,
        alignItems: 'center',
        flexShrink: 0,
        whiteSpace: 'nowrap',
        ...(!isCompactSticky && {
          [mediumUpMediaQuery]: {
            gridTemplateColumns: 'minmax(180px, auto) auto auto auto',
          },
        }),
      }}
    >
      {!isCompactSticky && (
        <>
          <FormControl size="small" sx={{ minWidth: 0 }}>
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
            onClick={(event) => onFilterClick(event.currentTarget)}
            sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}
          >
            {filterButtonLabel}
          </Button>
        </>
      )}

      <Button
        startIcon={<AddIcon />}
        variant="contained"
        onClick={onAddNote}
        sx={{
          gridColumn: { xs: '1 / -1', sm: 'auto' },
          width: { xs: '100%', sm: 'auto' },
          whiteSpace: 'nowrap',
        }}
      >
        {t('notes.toolbar.actions.add')}
      </Button>
    </Box>
  )
}
