import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  ColumnDto,
  DeleteNoteTypeDto,
  NoteTypeDto,
} from '../../../../types/api'
import { useNoteTypeDetailQuery } from '../../hooks/use-note-type-detail-query'
import { createDefaultFieldMappings } from './utils/create-default-field-mappings.util'
import { formatSettingsDate } from '../../utils/format-settings-date.util'
import { getCompatibleTargetColumns } from './utils/get-compatible-target-columns.util'
import { isSystemNoteTypeColumn } from './utils/is-system-note-type-column.util'

type DeleteNoteTypeMode = DeleteNoteTypeDto['mode']

interface DeleteNoteTypeDialogProps {
  noteType: NoteTypeDto | null
  noteTypes: NoteTypeDto[]
  onClose: () => void
  onSubmit: (payload: DeleteNoteTypeDto) => Promise<void>
  open: boolean
  submitError: string | null
  isPending: boolean
}

export const DeleteNoteTypeDialog = ({
  noteType,
  noteTypes,
  onClose,
  onSubmit,
  open,
  submitError,
  isPending,
}: DeleteNoteTypeDialogProps) => {
  const { t } = useTranslation()
  const [mode, setMode] = useState<DeleteNoteTypeMode>('delete-notes')
  const [selectedTargetNoteTypeId, setSelectedTargetNoteTypeId] = useState('')
  const [newTargetTitle, setNewTargetTitle] = useState('')
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({})
  const [validationError, setValidationError] = useState<string | null>(null)
  const sourceNoteTypeDetailQuery = useNoteTypeDetailQuery(noteType?.id)

  const availableTargetNoteTypes = useMemo(() => {
    if (!noteType) {
      return []
    }

    return noteTypes.filter((candidate) => candidate.id !== noteType.id)
  }, [noteType, noteTypes])

  const shouldCreateTargetNoteType = availableTargetNoteTypes.length === 0
  const targetNoteTypeId = shouldCreateTargetNoteType
    ? undefined
    : selectedTargetNoteTypeId
  const targetNoteTypeDetailQuery = useNoteTypeDetailQuery(targetNoteTypeId)

  const sourceColumns = useMemo(() => {
    return (sourceNoteTypeDetailQuery.data?.columns ?? []).filter((column) => {
      return !isSystemNoteTypeColumn(column)
    })
  }, [sourceNoteTypeDetailQuery.data?.columns])

  const targetColumns = useMemo(() => {
    return (targetNoteTypeDetailQuery.data?.columns ?? []).filter((column) => {
      return !isSystemNoteTypeColumn(column)
    })
  }, [targetNoteTypeDetailQuery.data?.columns])

  const defaultFieldMappings = useMemo(() => {
    return createDefaultFieldMappings(sourceColumns, targetColumns)
  }, [sourceColumns, targetColumns])

  const mappedFieldCount = useMemo(() => {
    return Object.values(fieldMappings).filter(Boolean).length
  }, [fieldMappings])

  const orphanedFieldCount = sourceColumns.length - mappedFieldCount

  useEffect(() => {
    if (!open || !noteType) {
      return
    }

    setMode('delete-notes')
    setSelectedTargetNoteTypeId(availableTargetNoteTypes[0]?.id ?? '')
    setNewTargetTitle('')
    setFieldMappings({})
    setValidationError(null)
  }, [availableTargetNoteTypes, noteType, open])

  useEffect(() => {
    if (!open || mode !== 'move-notes' || shouldCreateTargetNoteType) {
      return
    }

    setFieldMappings(defaultFieldMappings)
  }, [defaultFieldMappings, mode, open, shouldCreateTargetNoteType])

  const handleDialogClose = useCallback(() => {
    if (isPending) {
      return
    }

    onClose()
  }, [isPending, onClose])

  const handleSubmit = useCallback(async () => {
    if (!noteType) {
      return
    }

    setValidationError(null)

    if (mode === 'delete-notes') {
      await onSubmit({ mode: 'delete-notes' })
      return
    }

    if (shouldCreateTargetNoteType) {
      const normalizedTitle = newTargetTitle.trim()

      if (!normalizedTitle) {
        setValidationError(
          t('settings.noteTypes.delete.validation.newTargetTitleRequired')
        )
        return
      }

      await onSubmit({
        createTargetNoteType: {
          title: normalizedTitle,
        },
        fieldMappings: Object.entries(fieldMappings)
          .filter(([, targetColumnId]) => Boolean(targetColumnId))
          .map(([sourceColumnId, targetColumnId]) => ({
            sourceColumnId,
            targetColumnId,
          })),
        mode: 'move-notes',
      })
      return
    }

    if (!selectedTargetNoteTypeId) {
      setValidationError(
        t('settings.noteTypes.delete.validation.targetRequired')
      )
      return
    }

    await onSubmit({
      fieldMappings: Object.entries(fieldMappings)
        .filter(([, targetColumnId]) => Boolean(targetColumnId))
        .map(([sourceColumnId, targetColumnId]) => ({
          sourceColumnId,
          targetColumnId,
        })),
      mode: 'move-notes',
      targetNoteTypeId: selectedTargetNoteTypeId,
    })
  }, [
    fieldMappings,
    mode,
    newTargetTitle,
    noteType,
    onSubmit,
    selectedTargetNoteTypeId,
    shouldCreateTargetNoteType,
    t,
  ])

  const handleFieldMappingChange = useCallback(
    (sourceColumnId: string, targetColumnId: string) => {
      setFieldMappings((currentMappings) => ({
        ...currentMappings,
        [sourceColumnId]: targetColumnId,
      }))
    },
    []
  )

  if (!noteType) {
    return null
  }

  return (
    <Dialog fullWidth maxWidth="md" open={open} onClose={handleDialogClose}>
      <DialogTitle>{t('settings.noteTypes.delete.title')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Alert severity="warning">
            {t('settings.noteTypes.delete.summary', {
              title: noteType.title,
            })}
          </Alert>

          <Stack spacing={0.5}>
            <Typography color="text.secondary" variant="body2">
              {t('settings.noteTypes.grid.columns.createdAt')}
            </Typography>
            <Typography>{formatSettingsDate(noteType.createdAt)}</Typography>
          </Stack>

          <Stack spacing={0.5}>
            <Typography color="text.secondary" variant="body2">
              {t('settings.noteTypes.grid.columns.updatedAt')}
            </Typography>
            <Typography>{formatSettingsDate(noteType.updatedAt)}</Typography>
          </Stack>

          {submitError ? <Alert severity="error">{submitError}</Alert> : null}
          {validationError ? (
            <Alert severity="error">{validationError}</Alert>
          ) : null}

          <FormControl>
            <RadioGroup
              value={mode}
              onChange={(event) => {
                setMode(event.target.value as DeleteNoteTypeMode)
                setValidationError(null)
              }}
            >
              <FormControlLabel
                control={<Radio />}
                label={t('settings.noteTypes.delete.modes.deleteNotes')}
                value="delete-notes"
              />
              <FormControlLabel
                control={<Radio />}
                label={t('settings.noteTypes.delete.modes.moveNotes')}
                value="move-notes"
              />
            </RadioGroup>
          </FormControl>

          {mode === 'delete-notes' && noteTypes.length === 1 ? (
            <Alert severity="info">
              {t('settings.noteTypes.delete.lastTypeHint')}
            </Alert>
          ) : null}

          {mode === 'move-notes' ? (
            <Stack spacing={2}>
              {shouldCreateTargetNoteType ? (
                <TextField
                  fullWidth
                  helperText={t('settings.noteTypes.delete.createTargetHint')}
                  label={t('settings.noteTypes.delete.newTargetTitle')}
                  onChange={(event) => {
                    setNewTargetTitle(event.target.value)
                    setValidationError(null)
                  }}
                  value={newTargetTitle}
                />
              ) : (
                <FormControl fullWidth>
                  <InputLabel id="delete-note-type-target-label">
                    {t('settings.noteTypes.delete.targetLabel')}
                  </InputLabel>
                  <Select
                    label={t('settings.noteTypes.delete.targetLabel')}
                    labelId="delete-note-type-target-label"
                    onChange={(event) => {
                      setSelectedTargetNoteTypeId(String(event.target.value))
                      setValidationError(null)
                    }}
                    value={selectedTargetNoteTypeId}
                  >
                    {availableTargetNoteTypes.map((targetNoteType) => (
                      <MenuItem
                        key={targetNoteType.id}
                        value={targetNoteType.id}
                      >
                        {targetNoteType.title}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {targetNoteTypeDetailQuery.isLoading &&
              !shouldCreateTargetNoteType ? (
                <Stack alignItems="center" direction="row" spacing={1.5}>
                  <CircularProgress size={20} />
                  <Typography color="text.secondary">
                    {t('settings.noteTypes.delete.mapping.loading')}
                  </Typography>
                </Stack>
              ) : null}

              <Stack spacing={1.5}>
                <Typography variant="subtitle1">
                  {t('settings.noteTypes.delete.mapping.title')}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {t('settings.noteTypes.delete.mapping.summary', {
                    mappedCount: mappedFieldCount,
                    orphanedCount: orphanedFieldCount,
                  })}
                </Typography>

                {sourceColumns.length === 0 ? (
                  <Alert severity="info">
                    {t('settings.noteTypes.delete.mapping.emptySource')}
                  </Alert>
                ) : shouldCreateTargetNoteType ? (
                  <Alert severity="info">
                    {t(
                      'settings.noteTypes.delete.mapping.emptyTargetForNewType'
                    )}
                  </Alert>
                ) : targetColumns.length === 0 ? (
                  <Alert severity="info">
                    {t('settings.noteTypes.delete.mapping.emptyTarget')}
                  </Alert>
                ) : null}

                {sourceColumns.map((sourceColumn) => {
                  const compatibleTargetColumns = getCompatibleTargetColumns(
                    sourceColumn,
                    targetColumns
                  )

                  return (
                    <Stack key={sourceColumn.id} spacing={1}>
                      <Typography variant="body2">
                        {t('settings.noteTypes.delete.mapping.rowLabel', {
                          sourceTitle: sourceColumn.title,
                          sourceType: t(
                            `settings.columns.types.${sourceColumn.type}`
                          ),
                        })}
                      </Typography>
                      <FormControl fullWidth>
                        <InputLabel id={`mapping-${sourceColumn.id}`}>
                          {t('settings.noteTypes.delete.mapping.targetField')}
                        </InputLabel>
                        <Select
                          label={t(
                            'settings.noteTypes.delete.mapping.targetField'
                          )}
                          labelId={`mapping-${sourceColumn.id}`}
                          onChange={(event) => {
                            handleFieldMappingChange(
                              sourceColumn.id,
                              String(event.target.value)
                            )
                          }}
                          value={fieldMappings[sourceColumn.id] ?? ''}
                        >
                          <MenuItem value="">
                            {t('settings.noteTypes.delete.mapping.unmapped')}
                          </MenuItem>
                          {compatibleTargetColumns.map((targetColumn) => (
                            <MenuItem
                              key={targetColumn.id}
                              value={targetColumn.id}
                            >
                              {targetColumn.title}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Stack>
                  )
                })}
              </Stack>
            </Stack>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={isPending} onClick={handleDialogClose}>
          {t('settings.noteTypes.actions.cancel')}
        </Button>
        <Button
          color="error"
          disabled={isPending}
          onClick={() => {
            void handleSubmit()
          }}
          variant="contained"
        >
          {isPending
            ? t('settings.noteTypes.delete.submitting')
            : t('settings.noteTypes.delete.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
