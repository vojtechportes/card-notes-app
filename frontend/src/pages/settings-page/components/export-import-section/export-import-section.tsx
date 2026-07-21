import {
  Alert,
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material'
import type { SelectChangeEvent } from '@mui/material/Select'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  ImportLabelIssueDto,
  ImportUnmatchedFieldDto,
} from '../../../../types/api'
import { useExportDataMutation } from '../../hooks/use-export-data-mutation'
import { useImportDataMutation } from '../../hooks/use-import-data-mutation'
import { useNoteTypesQuery } from '../../hooks/use-note-types-query'
import { SettingsSection } from '../settings-section'
import { LabelImportIssuesAlert } from './components/label-import-issues-alert/label-import-issues-alert'
import { createExportFileName } from './utils/create-export-file-name.util'
import { createImportSuccessMessage } from './utils/create-import-success-message.util'
import { formatUnmatchedFieldLabel } from './utils/format-unmatched-field-label.util'
import { getImportFileKind } from './utils/get-import-file-kind.util'

interface FeedbackState {
  message: string
  severity: 'error' | 'success'
}

export const ExportImportSection = () => {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedTargetNoteTypeId, setSelectedTargetNoteTypeId] = useState('')
  const [labelIssues, setLabelIssues] = useState<ImportLabelIssueDto[]>([])
  const [unmatchedFields, setUnmatchedFields] = useState<
    ImportUnmatchedFieldDto[]
  >([])
  const noteTypesQuery = useNoteTypesQuery()
  const exportDataMutation = useExportDataMutation()
  const importDataMutation = useImportDataMutation()

  const selectedFileKind = useMemo(
    () => getImportFileKind(selectedFile),
    [selectedFile]
  )
  const requiresTargetNoteType = useMemo(
    () => selectedFileKind === 'xlsx',
    [selectedFileKind]
  )
  const isImportDisabled = useMemo(() => {
    return (
      !selectedFile ||
      exportDataMutation.isPending ||
      importDataMutation.isPending ||
      (requiresTargetNoteType && !selectedTargetNoteTypeId)
    )
  }, [
    exportDataMutation.isPending,
    importDataMutation.isPending,
    requiresTargetNoteType,
    selectedFile,
    selectedTargetNoteTypeId,
  ])

  const resetFileSelection = useCallback(() => {
    setSelectedFile(null)
    setSelectedTargetNoteTypeId('')

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleExport = useCallback(async () => {
    setFeedback(null)
    setLabelIssues([])
    setUnmatchedFields([])

    try {
      const exportData = await exportDataMutation.mutateAsync()
      const exportBlob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      })
      const objectUrl = URL.createObjectURL(exportBlob)
      const downloadLink = document.createElement('a')

      downloadLink.href = objectUrl
      downloadLink.download = createExportFileName(exportData.exportedAt)
      downloadLink.click()
      window.requestAnimationFrame(() => {
        URL.revokeObjectURL(objectUrl)
      })

      setFeedback({
        message: t('settings.exportImport.status.exported'),
        severity: 'success',
      })
    } catch {
      setFeedback({
        message: t('settings.exportImport.errors.export'),
        severity: 'error',
      })
    }
  }, [exportDataMutation, t])

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextFile = event.target.files?.[0] ?? null

      setFeedback(null)
      setLabelIssues([])
      setSelectedFile(nextFile)
      setSelectedTargetNoteTypeId('')
      setUnmatchedFields([])
    },
    []
  )

  const handleTargetNoteTypeChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      setSelectedTargetNoteTypeId(event.target.value)
    },
    []
  )

  const handleImport = useCallback(async () => {
    if (!selectedFile) {
      setFeedback({
        message: t('settings.exportImport.hints.noFile'),
        severity: 'error',
      })
      return
    }

    if (requiresTargetNoteType && !selectedTargetNoteTypeId) {
      setFeedback({
        message: t('settings.exportImport.errors.targetRequired'),
        severity: 'error',
      })
      return
    }

    setFeedback(null)
    setLabelIssues([])
    setUnmatchedFields([])

    try {
      const importResult = await importDataMutation.mutateAsync({
        file: selectedFile,
        targetNoteTypeId: selectedTargetNoteTypeId || undefined,
      })

      setFeedback({
        message: createImportSuccessMessage(t, importResult),
        severity: 'success',
      })
      setLabelIssues(importResult.labelIssues)
      setUnmatchedFields(importResult.unmatchedFields)
      resetFileSelection()
    } catch {
      setFeedback({
        message: t('settings.exportImport.errors.import'),
        severity: 'error',
      })
    }
  }, [
    importDataMutation,
    requiresTargetNoteType,
    resetFileSelection,
    selectedFile,
    selectedTargetNoteTypeId,
    t,
  ])

  return (
    <SettingsSection>
      <Stack spacing={2}>
        <Typography color="text.secondary" variant="body2">
          {t('settings.exportImport.summary')}
        </Typography>

        {feedback ? (
          <Alert severity={feedback.severity}>{feedback.message}</Alert>
        ) : null}

        <LabelImportIssuesAlert issues={labelIssues} />

        {unmatchedFields.length > 0 ? (
          <Alert severity="warning">
            <Stack spacing={1}>
              <Typography variant="body2">
                {t('settings.exportImport.unmatchedFields.summary')}
              </Typography>
              {unmatchedFields.map((field) => (
                <Typography
                  key={`${field.noteTypeTitle ?? 'none'}-${field.name}`}
                  variant="body2"
                >
                  {formatUnmatchedFieldLabel(t, field)}
                </Typography>
              ))}
            </Stack>
          </Alert>
        ) : null}

        <Stack direction={{ sm: 'row', xs: 'column' }} spacing={1.5}>
          <Button
            disabled={
              exportDataMutation.isPending || importDataMutation.isPending
            }
            onClick={handleExport}
            variant="contained"
          >
            {exportDataMutation.isPending
              ? t('settings.exportImport.actions.exporting')
              : t('settings.exportImport.actions.export')}
          </Button>

          <Button
            component="label"
            disabled={importDataMutation.isPending}
            variant="outlined"
          >
            {selectedFile
              ? t('settings.exportImport.actions.changeFile')
              : t('settings.exportImport.actions.selectFile')}
            <input
              accept=".json,application/json,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              aria-label={t('settings.exportImport.fields.fileInput')}
              hidden
              onChange={handleFileChange}
              ref={fileInputRef}
              type="file"
            />
          </Button>

          <Button
            disabled={isImportDisabled}
            onClick={handleImport}
            variant="contained"
          >
            {importDataMutation.isPending
              ? t('settings.exportImport.actions.importing')
              : t('settings.exportImport.actions.import')}
          </Button>
        </Stack>

        <FormControl
          disabled={
            !selectedFile ||
            importDataMutation.isPending ||
            noteTypesQuery.isLoading ||
            Boolean(noteTypesQuery.isError)
          }
          fullWidth
          size="small"
        >
          <InputLabel id="import-target-note-type-label">
            {t('settings.exportImport.fields.targetNoteType')}
          </InputLabel>
          <Select
            label={t('settings.exportImport.fields.targetNoteType')}
            labelId="import-target-note-type-label"
            onChange={handleTargetNoteTypeChange}
            value={selectedTargetNoteTypeId}
          >
            <MenuItem value="">
              {t('settings.exportImport.fields.targetNoteTypePlaceholder')}
            </MenuItem>
            {(noteTypesQuery.data ?? []).map((noteType) => (
              <MenuItem key={noteType.id} value={noteType.id}>
                {noteType.title}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>
            {noteTypesQuery.isLoading
              ? t('settings.exportImport.status.loadingNoteTypes')
              : noteTypesQuery.isError
                ? t('settings.exportImport.errors.noteTypes')
                : requiresTargetNoteType
                  ? t('settings.exportImport.hints.targetRequired')
                  : t('settings.exportImport.hints.targetOptional')}
          </FormHelperText>
        </FormControl>

        <Typography color="text.secondary" variant="body2">
          {selectedFile
            ? t('settings.exportImport.status.fileSelected', {
                fileName: selectedFile.name,
              })
            : t('settings.exportImport.hints.selectFile')}
        </Typography>
      </Stack>
    </SettingsSection>
  )
}
