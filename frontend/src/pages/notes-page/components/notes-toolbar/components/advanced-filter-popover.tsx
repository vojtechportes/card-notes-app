import { Button, Divider, Popover, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { LabelDto, NoteTypeDto } from '../../../../../types/api'
import type { LabelMatchMode } from '../../../types/label-match-mode'
import { ActiveFilterSummary } from './active-filter-summary'
import { LabelFilterSection } from './label-filter-section'
import { NoteTypeFilterSection } from './note-type-filter-section'

interface AdvancedFilterPopoverProps {
  anchorEl: HTMLElement | null
  isLabelsLoading: boolean
  isNoteTypesLoading: boolean
  labelMatchMode: LabelMatchMode
  labels: LabelDto[]
  noteTypes: NoteTypeDto[]
  open: boolean
  selectedLabelIds: string[]
  selectedNoteTypeIds: string[]
  onClose: () => void
  onLabelIdsChange: (labelIds: string[]) => void
  onLabelMatchModeChange: (matchMode: LabelMatchMode) => void
  onNoteTypeIdsChange: (noteTypeIds: string[]) => void
}

export const AdvancedFilterPopover = ({
  anchorEl,
  isLabelsLoading,
  isNoteTypesLoading,
  labelMatchMode,
  labels,
  noteTypes,
  open,
  selectedLabelIds,
  selectedNoteTypeIds,
  onClose,
  onLabelIdsChange,
  onLabelMatchModeChange,
  onNoteTypeIdsChange,
}: AdvancedFilterPopoverProps) => {
  const { t } = useTranslation()
  const activeFilterCount = selectedLabelIds.length + selectedNoteTypeIds.length

  return (
    <Popover
      anchorEl={anchorEl}
      anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
      onClose={onClose}
      open={open}
      transformOrigin={{ horizontal: 'left', vertical: 'top' }}
    >
      <Stack spacing={2} sx={{ p: 2, width: 360, maxWidth: '100%' }}>
        <Stack spacing={0.5}>
          <Typography variant="subtitle2">
            {t('notes.toolbar.filters.title')}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {t('notes.toolbar.filters.description')}
          </Typography>
        </Stack>

        <Divider />

        <NoteTypeFilterSection
          isLoading={isNoteTypesLoading}
          noteTypes={noteTypes}
          selectedNoteTypeIds={selectedNoteTypeIds}
          onNoteTypeIdsChange={onNoteTypeIdsChange}
        />

        <Divider />

        <LabelFilterSection
          isLoading={isLabelsLoading}
          labelMatchMode={labelMatchMode}
          labels={labels}
          selectedLabelIds={selectedLabelIds}
          onLabelIdsChange={onLabelIdsChange}
          onLabelMatchModeChange={onLabelMatchModeChange}
        />

        <ActiveFilterSummary
          labels={labels}
          noteTypes={noteTypes}
          selectedLabelIds={selectedLabelIds}
          selectedNoteTypeIds={selectedNoteTypeIds}
        />

        <Stack direction="row" justifyContent="space-between" spacing={1}>
          <Button
            disabled={activeFilterCount === 0}
            onClick={() => {
              onLabelIdsChange([])
              onNoteTypeIdsChange([])
            }}
            size="small"
          >
            {t('notes.toolbar.filters.actions.clear')}
          </Button>
          <Button onClick={onClose} size="small" variant="contained">
            {t('notes.toolbar.filters.actions.close')}
          </Button>
        </Stack>
      </Stack>
    </Popover>
  )
}
