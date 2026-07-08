import AddIcon from '@mui/icons-material/Add';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import SearchIcon from '@mui/icons-material/Search';
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
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { ListNotesQueryDto } from '../../../../types/api';

export type NoteSortBy = NonNullable<ListNotesQueryDto['sortBy']>;
export type NoteSortDirection = NonNullable<ListNotesQueryDto['sortDirection']>;

interface NotesToolbarProps {
  searchQuery: string;
  sortBy: NoteSortBy;
  sortDirection: NoteSortDirection;
  onAddNote: () => void;
  onSearchQueryChange: (searchQuery: string) => void;
  onSortByChange: (sortBy: NoteSortBy) => void;
  onSortDirectionChange: (sortDirection: NoteSortDirection) => void;
}

export const NotesToolbar = ({
  searchQuery,
  sortBy,
  sortDirection,
  onAddNote,
  onSearchQueryChange,
  onSortByChange,
  onSortDirectionChange,
}: NotesToolbarProps) => {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        p: 2,
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
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
        >
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 180 } }}>
            <InputLabel htmlFor="notes-sort-by">
              {t('notes.toolbar.sortBy.label')}
            </InputLabel>
            <Select
              native
              label={t('notes.toolbar.sortBy.label')}
              value={sortBy}
              onChange={(event) => onSortByChange(event.target.value as NoteSortBy)}
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
                onSortDirectionChange(value);
              }
            }}
          >
            <ToggleButton
              aria-label={t('notes.toolbar.sortDirection.options.asc')}
              value="asc"
            >
              <ArrowUpwardIcon fontSize="small" />
              <Box component="span" sx={{ ml: 0.75 }}>
                {t('notes.toolbar.sortDirection.short.asc')}
              </Box>
            </ToggleButton>
            <ToggleButton
              aria-label={t('notes.toolbar.sortDirection.options.desc')}
              value="desc"
            >
              <ArrowDownwardIcon fontSize="small" />
              <Box component="span" sx={{ ml: 0.75 }}>
                {t('notes.toolbar.sortDirection.short.desc')}
              </Box>
            </ToggleButton>
          </ToggleButtonGroup>

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
  );
};
