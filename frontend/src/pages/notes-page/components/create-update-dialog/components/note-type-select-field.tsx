import { FormControl, InputLabel, MenuItem, Select } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { NoteTypeDto } from '../../../../../types/api'
import type { CreateUpdateDialogMode } from '../create-update-dialog'

interface NoteTypeSelectFieldProps {
  disabled: boolean
  mode: CreateUpdateDialogMode
  noteTypes: NoteTypeDto[]
  selectedNoteTypeId?: string
  onNoteTypeChange: (noteTypeId: string) => void
}

export const NoteTypeSelectField = ({
  disabled,
  mode,
  noteTypes,
  selectedNoteTypeId,
  onNoteTypeChange,
}: NoteTypeSelectFieldProps) => {
  const { t } = useTranslation()
  const labelId = 'note-type-select-label'
  const selectId = 'note-type-select'

  return (
    <FormControl fullWidth size="small">
      <InputLabel id={labelId}>
        {t('notes.createUpdateDialog.noteType.label')}
      </InputLabel>
      <Select
        disabled={disabled}
        id={selectId}
        label={t('notes.createUpdateDialog.noteType.label')}
        labelId={labelId}
        value={selectedNoteTypeId ?? ''}
        onChange={(event) => onNoteTypeChange(String(event.target.value))}
      >
        {mode === 'create' ? (
          <MenuItem value="">
            {t('notes.createUpdateDialog.noteType.placeholder')}
          </MenuItem>
        ) : null}
        {noteTypes.map((noteType) => (
          <MenuItem key={noteType.id} value={noteType.id}>
            {noteType.title}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
