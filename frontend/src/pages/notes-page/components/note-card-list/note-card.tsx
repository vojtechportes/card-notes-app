import {
  Button,
  Card,
  CardActions,
  CardContent,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import type {
  ColumnDto,
  GeneralSettingsDto,
  NoteDto,
} from "../../../../types/api";
import { getNoteCardFields } from "../../utils/get-note-card-fields.util";
import { NoteCardFieldValue } from "./note-card-field-value";

interface NoteCardProps {
  columns: ColumnDto[];
  generalSettings: GeneralSettingsDto;
  note: NoteDto;
  onEditNote?: (note: NoteDto) => void;
}

export const NoteCard = ({
  columns,
  generalSettings,
  note,
  onEditNote,
}: NoteCardProps) => {
  const { t } = useTranslation();
  const fields = getNoteCardFields(
    note,
    columns,
    generalSettings.cardFieldDisplayCount,
  );

  return (
    <Card sx={{ height: "100%" }} variant="outlined">
      <CardContent>
        {fields.length === 0 ? (
          <Typography color="text.secondary" variant="body2">
            {t("notes.card.noVisibleFields")}
          </Typography>
        ) : (
          <Stack divider={<Divider flexItem />} spacing={2}>
            {fields.map((field) => (
              <Stack key={field.columnId} spacing={1}>
                <Typography component="h3" variant="subtitle2">
                  {field.title}
                </Typography>
                <NoteCardFieldValue
                  emptyImageLabel={t("notes.card.imagePreviewUnavailable")}
                  field={field}
                  textTruncationLength={generalSettings.textTruncationLength}
                />
              </Stack>
            ))}
          </Stack>
        )}
      </CardContent>

      {onEditNote && (
        <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
          <Button
            onClick={() => onEditNote(note)}
            size="small"
            variant="outlined"
          >
            {t("notes.card.actions.edit")}
          </Button>
        </CardActions>
      )}
    </Card>
  );
};
