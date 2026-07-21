import {
  Checkbox,
  FormControlLabel,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { LabelChip } from '../../../../../components/label-chip/label-chip'
import type { LabelDto } from '../../../../../types/api'
import type { LabelMatchMode } from '../../../types/label-match-mode'

interface LabelFilterSectionProps {
  isLoading: boolean
  labelMatchMode: LabelMatchMode
  labels: LabelDto[]
  selectedLabelIds: string[]
  onLabelIdsChange: (labelIds: string[]) => void
  onLabelMatchModeChange: (matchMode: LabelMatchMode) => void
}

export const LabelFilterSection = ({
  isLoading,
  labelMatchMode,
  labels,
  selectedLabelIds,
  onLabelIdsChange,
  onLabelMatchModeChange,
}: LabelFilterSectionProps) => {
  const { t } = useTranslation()

  return (
    <Stack spacing={1}>
      <Stack spacing={0.5}>
        <Typography variant="subtitle2">
          {t('notes.toolbar.filters.labels.title')}
        </Typography>
        <Typography color="text.secondary" variant="body2">
          {t('notes.toolbar.filters.labels.description')}
        </Typography>
      </Stack>

      <ToggleButtonGroup
        exclusive
        aria-label={t('notes.toolbar.filters.labels.matchMode.label')}
        fullWidth
        size="small"
        value={labelMatchMode}
        onChange={(_, value: LabelMatchMode | null) => {
          if (value) {
            onLabelMatchModeChange(value)
          }
        }}
      >
        <ToggleButton value="or">
          {t('notes.toolbar.filters.labels.matchMode.options.or')}
        </ToggleButton>
        <ToggleButton value="and">
          {t('notes.toolbar.filters.labels.matchMode.options.and')}
        </ToggleButton>
      </ToggleButtonGroup>

      {isLoading ? (
        <Typography color="text.secondary" variant="body2">
          {t('notes.toolbar.filters.labels.status.loading')}
        </Typography>
      ) : labels.length === 0 ? (
        <Typography color="text.secondary" variant="body2">
          {t('notes.toolbar.filters.labels.status.empty')}
        </Typography>
      ) : (
        <Stack spacing={0.5}>
          {labels.map((label) => (
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedLabelIds.includes(label.id)}
                  onChange={() => {
                    onLabelIdsChange(
                      selectedLabelIds.includes(label.id)
                        ? selectedLabelIds.filter(
                            (selectedId) => selectedId !== label.id
                          )
                        : [...selectedLabelIds, label.id]
                    )
                  }}
                />
              }
              key={label.id}
              label={<LabelChip color={label.color} title={label.title} />}
            />
          ))}
        </Stack>
      )}
    </Stack>
  )
}
