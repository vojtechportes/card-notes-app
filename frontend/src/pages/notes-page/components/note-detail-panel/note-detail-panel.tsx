import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import {
  DetailContent,
  DetailContentContainer,
  DetailContentItem,
} from '../../../../components/detail-content'
import type {
  ColumnDto,
  GeneralSettingsDto,
  NoteDto,
} from '../../../../types/api'
import { getNoteDetailFields } from '../../utils/get-note-detail-fields.util'
import { NoteFieldValue } from '../note-field-value/note-field-value'

interface NoteDetailPanelProps {
  columns: ColumnDto[]
  generalSettings: GeneralSettingsDto
  note: NoteDto
  noteTypeColumnsById?: Record<string, ColumnDto[]>
}

export const NoteDetailPanel = ({
  columns,
  generalSettings,
  note,
  noteTypeColumnsById,
}: NoteDetailPanelProps) => {
  const { t } = useTranslation()
  const resolvedColumns = noteTypeColumnsById?.[note.noteTypeId] ?? columns
  const fields = getNoteDetailFields(
    note,
    resolvedColumns,
    !!generalSettings.mergeDateTimeFields,
    t('notes.fields.lastUpdatedAt')
  )

  return (
    <DetailContentContainer fullHeight>
      {fields.length === 0 ? (
        <Stack spacing={1} sx={{ p: 3 }}>
          <Typography component="h3" variant="h6">
            {t('notes.detail.empty.title')}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {t('notes.detail.empty.description')}
          </Typography>
        </Stack>
      ) : (
        <DetailContent isScrollable transformsAtFullWidth>
          {fields.map((field) => (
            <DetailContentItem key={field.columnId} label={field.title}>
              <NoteFieldValue
                emptyImageLabel={t('notes.card.imagePreviewUnavailable')}
                emptyValueLabel={t('notes.detail.emptyValue')}
                field={field}
                textTruncationLength={generalSettings.textTruncationLength}
              />
            </DetailContentItem>
          ))}
        </DetailContent>
      )}
    </DetailContentContainer>
  )
}
