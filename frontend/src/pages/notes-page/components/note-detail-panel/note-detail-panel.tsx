import { Divider, Stack, Typography } from '@mui/material'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  ColumnDto,
  GeneralSettingsDto,
  LabelDto,
  NoteDto,
} from '../../../../types/api'
import { getNoteBackgroundColor } from '../../utils/get-note-background-color.util'
import { getNoteDetailFields } from '../../utils/get-note-detail-fields.util'
import { NoteDetailItem } from '../note-detail-item/note-detail-item'
import { NoteFieldValue } from '../note-field-value/note-field-value'

type NoteDetailPanelStyle = CSSProperties & {
  '--note-background-color': string
}

interface NoteDetailPanelProps {
  columns: ColumnDto[]
  generalSettings: GeneralSettingsDto
  labels: LabelDto[]
  note: NoteDto
  noteTypeColumnsById?: Record<string, ColumnDto[]>
  noteTypeTitle?: string
}

export const NoteDetailPanel = ({
  columns,
  generalSettings,
  labels,
  note,
  noteTypeColumnsById,
  noteTypeTitle,
}: NoteDetailPanelProps) => {
  const { t } = useTranslation()
  const resolvedColumns = noteTypeColumnsById?.[note.noteTypeId] ?? columns
  const fields = getNoteDetailFields(
    note,
    resolvedColumns,
    !!generalSettings.mergeDateTimeFields,
    t('notes.fields.lastUpdatedAt')
  )
  const noteDetailPanelStyle: NoteDetailPanelStyle = {
    '--note-background-color': getNoteBackgroundColor(note.background),
  }

  if (fields.length === 0) {
    return (
      <Stack
        spacing={1}
        style={noteDetailPanelStyle}
        sx={{ bgcolor: 'var(--note-background-color)', flex: 1, p: 3 }}
      >
        <Typography component="h3" variant="h6">
          {t('notes.detail.empty.title')}
        </Typography>
        <Typography color="text.secondary" variant="body2">
          {t('notes.detail.empty.description')}
        </Typography>
      </Stack>
    )
  }

  return (
    <Stack
      divider={<Divider flexItem />}
      spacing={0}
      style={noteDetailPanelStyle}
      sx={{ bgcolor: 'var(--note-background-color)', flex: 1, p: 3 }}
    >
      <Stack spacing={2.5}>
        {noteTypeTitle ? (
          <NoteDetailItem label={t('notes.detail.noteType')}>
            <Typography>{noteTypeTitle}</Typography>
          </NoteDetailItem>
        ) : null}

        {fields.map((field) => (
          <NoteDetailItem key={field.columnId} label={field.title}>
            <NoteFieldValue
              emptyImageLabel={t('notes.card.imagePreviewUnavailable')}
              emptyValueLabel={t('notes.detail.emptyValue')}
              enableImageOverlay
              field={field}
              imagePreviewMaxWidth={520}
              labels={labels}
              textTruncationLength={null}
            />
          </NoteDetailItem>
        ))}
      </Stack>
    </Stack>
  )
}
