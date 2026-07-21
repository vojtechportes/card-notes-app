import { Stack } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { LabelChip } from '../../../../../components/label-chip/label-chip'
import type { LabelDto } from '../../../../../types/api'

interface LabelNoteFieldValueProps {
  labelIds: string[]
  labels: LabelDto[]
}

export const LabelNoteFieldValue = ({
  labelIds,
  labels,
}: LabelNoteFieldValueProps) => {
  const { t } = useTranslation()
  const labelById = new Map(labels.map((label) => [label.id, label]))

  return (
    <Stack direction="row" flexWrap="wrap" gap={0.75}>
      {labelIds.map((labelId) => {
        const label = labelById.get(labelId)

        return (
          <LabelChip
            color={label?.color ?? '#475E75'}
            key={labelId}
            title={label?.title ?? t('notes.labels.unavailable')}
          />
        )
      })}
    </Stack>
  )
}
