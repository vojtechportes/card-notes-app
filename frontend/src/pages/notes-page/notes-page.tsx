import { useState } from 'react';
import { Card, CardContent, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Masonry } from '../../components/masonry/masonry';
import { CreateUpdateDialog } from './components/create-update-dialog/create-update-dialog';
import { NotesToolbar } from './components/notes-toolbar/notes-toolbar';
import type {
  NoteSortBy,
  NoteSortDirection,
} from './components/notes-toolbar/notes-toolbar';
import { useNotesQuery } from './hooks/use-notes-query';
import { useNotesSearch } from './hooks/use-notes-search';

const PREVIEW_CARD_KEYS = ['structure', 'search', 'images'];
const DEFAULT_SORT_BY: NoteSortBy = 'updatedAt';
const DEFAULT_SORT_DIRECTION: NoteSortDirection = 'desc';

export const NotesPage = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<NoteSortBy>(DEFAULT_SORT_BY);
  const [sortDirection, setSortDirection] =
    useState<NoteSortDirection>(DEFAULT_SORT_DIRECTION);
  const [isCreateNoteDialogOpen, setIsCreateNoteDialogOpen] = useState(false);
  const notesQuery = useNotesQuery({ sortBy, sortDirection });
  const filteredNotes = useNotesSearch(notesQuery.data, searchQuery);

  return (
    <>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="h4" component="h2">
            {t('notes.title')}
          </Typography>
          <Typography color="text.secondary">{t('notes.description')}</Typography>
        </Stack>

        <NotesToolbar
          searchQuery={searchQuery}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onAddNote={() => setIsCreateNoteDialogOpen(true)}
          onSearchQueryChange={setSearchQuery}
          onSortByChange={setSortBy}
          onSortDirectionChange={setSortDirection}
        />

        <Stack spacing={0.75}>
          <Typography color="text.secondary" variant="body2">
            {notesQuery.isLoading
              ? t('notes.status.loading')
              : t('notes.status.visibleCount', { count: filteredNotes.length })}
          </Typography>
          {notesQuery.isError && (
            <Typography color="error" variant="body2">
              {t('notes.status.loadError')}
            </Typography>
          )}
        </Stack>

        <Masonry columns={{ xs: 1, sm: 2, md: 3 }} gap={16}>
          {PREVIEW_CARD_KEYS.map((key) => (
            <Card key={key} variant="outlined">
              <CardContent>
                <Typography variant="h6" component="h3" gutterBottom>
                  {t(`notes.previewCards.${key}.title`)}
                </Typography>
                <Typography color="text.secondary">
                  {t(`notes.previewCards.${key}.description`)}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Masonry>
      </Stack>

      <CreateUpdateDialog
        mode="create"
        open={isCreateNoteDialogOpen}
        onClose={() => setIsCreateNoteDialogOpen(false)}
      />
    </>
  );
};
