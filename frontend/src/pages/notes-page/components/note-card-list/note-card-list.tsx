import { Card, CardContent, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Masonry } from '../../../../components/masonry/masonry';
import type { ColumnDto, GeneralSettingsDto, NoteDto } from '../../../../types/api';
import { NoteCard } from './note-card';

interface NoteCardListProps {
  columns: ColumnDto[];
  generalSettings: GeneralSettingsDto;
  notes: NoteDto[];
  onDeleteNote?: (note: NoteDto) => void;
  onEditNote?: (note: NoteDto) => void;
  onOpenNoteDetail?: (note: NoteDto) => void;
}

export const NoteCardList = ({
  columns,
  generalSettings,
  notes,
  onDeleteNote,
  onEditNote,
  onOpenNoteDetail,
}: NoteCardListProps) => {
  const { t } = useTranslation();

  if (notes.length === 0) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1}>
            <Typography component="h3" variant="h6">
              {t('notes.empty.title')}
            </Typography>
            <Typography color="text.secondary">
              {t('notes.empty.description')}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Masonry columns={{ xs: 1, sm: 2, md: 3 }} gap={16}>
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          columns={columns}
          generalSettings={generalSettings}
          note={note}
          onDeleteNote={onDeleteNote}
          onEditNote={onEditNote}
          onOpenNoteDetail={onOpenNoteDetail}
        />
      ))}
    </Masonry>
  );
};
