import {
  Button,
  Card,
  CardActions,
  CardContent,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type {
  ColumnDto,
  GeneralSettingsDto,
  NoteDto,
} from '../../../../types/api';
import { getNoteCardFields } from '../../utils/get-note-card-fields.util';
import { NoteFieldValue as NoteCardFieldValue } from '../note-field-value/note-field-value';

interface NoteCardProps {
  columns: ColumnDto[];
  generalSettings: GeneralSettingsDto;
  note: NoteDto;
  onDeleteNote?: (note: NoteDto) => void;
  onEditNote?: (note: NoteDto) => void;
  onOpenNoteDetail?: (note: NoteDto) => void;
}

export const NoteCard = ({
  columns,
  generalSettings,
  note,
  onDeleteNote,
  onEditNote,
  onOpenNoteDetail,
}: NoteCardProps) => {
  const { t } = useTranslation();
  const fields = getNoteCardFields(
    note,
    columns,
    generalSettings.cardFieldDisplayCount,
  );
  const hasActions = Boolean(onOpenNoteDetail || onEditNote || onDeleteNote);

  return (
    <Card sx={{ height: '100%' }} variant="outlined">
      <CardContent>
        {fields.length === 0 ? (
          <Typography color="text.secondary" variant="body2">
            {t('notes.card.noVisibleFields')}
          </Typography>
        ) : (
          <Stack divider={<Divider flexItem />} spacing={2}>
            {fields.map((field) => (
              <Stack key={field.columnId} spacing={1}>
                <Typography component="h3" variant="subtitle2">
                  {field.title}
                </Typography>
                <NoteCardFieldValue
                  emptyImageLabel={t('notes.card.imagePreviewUnavailable')}
                  field={field}
                  textTruncationLength={generalSettings.textTruncationLength}
                />
              </Stack>
            ))}
          </Stack>
        )}
      </CardContent>

      {hasActions && (
        <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
          {onOpenNoteDetail && (
            <Button
              onClick={() => onOpenNoteDetail(note)}
              size="small"
              variant="contained"
            >
              {t('notes.card.actions.openDetail')}
            </Button>
          )}
          {onEditNote && (
            <Button
              onClick={() => onEditNote(note)}
              size="small"
              variant="outlined"
            >
              {t('notes.card.actions.edit')}
            </Button>
          )}
          {onDeleteNote && (
            <Button
              color="error"
              onClick={() => onDeleteNote(note)}
              size="small"
              variant="outlined"
            >
              {t('notes.card.actions.delete')}
            </Button>
          )}
        </CardActions>
      )}
    </Card>
  );
};
