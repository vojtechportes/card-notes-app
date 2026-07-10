import { Alert, Button, Stack, Typography } from '@mui/material'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ImportResultDto } from '../../../../types/api'
import { useExportDataMutation } from '../../hooks/use-export-data-mutation'
import { useImportDataMutation } from '../../hooks/use-import-data-mutation'
import { SettingsSection } from '../settings-section'
import { isExportImportData } from './utils/is-export-import-data.util'
import { parseJsonFile } from './utils/parse-json-file.util'

interface FeedbackState {
  message: string
  severity: 'error' | 'success'
}

const createExportFileName = (exportedAt: string) => {
  return `card-notes-export-${exportedAt.replace(/[.:]/g, '-')}.json`
}

const createImportSuccessMessage = (
  t: ReturnType<typeof useTranslation>['t'],
  result: ImportResultDto
) => {
  const generalSettingsStatus = result.updatedGeneralSettings
    ? t('settings.exportImport.status.generalSettingsUpdated')
    : t('settings.exportImport.status.generalSettingsUnchanged')

  return t('settings.exportImport.status.imported', {
    generalSettingsStatus,
    importedColumns: result.importedColumns,
    importedNotes: result.importedNotes,
  })
}

export const ExportImportSection = () => {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const exportDataMutation = useExportDataMutation()
  const importDataMutation = useImportDataMutation()

  const resetFileSelection = useCallback(() => {
    setSelectedFile(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleExport = useCallback(async () => {
    setFeedback(null)

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
      setSelectedFile(nextFile)
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

    setFeedback(null)

    let parsedData: unknown

    try {
      parsedData = await parseJsonFile(selectedFile)
    } catch {
      setFeedback({
        message: t('settings.exportImport.errors.invalidJson'),
        severity: 'error',
      })
      return
    }

    if (!isExportImportData(parsedData)) {
      setFeedback({
        message: t('settings.exportImport.errors.invalidShape'),
        severity: 'error',
      })
      return
    }

    try {
      const importResult = await importDataMutation.mutateAsync(parsedData)

      setFeedback({
        message: createImportSuccessMessage(t, importResult),
        severity: 'success',
      })
      resetFileSelection()
    } catch {
      setFeedback({
        message: t('settings.exportImport.errors.import'),
        severity: 'error',
      })
    }
  }, [importDataMutation, resetFileSelection, selectedFile, t])

  return (
    <SettingsSection
      description={t('settings.sections.exportImport.description')}
      title={t('settings.sections.exportImport.title')}
    >
      <Stack spacing={2}>
        <Typography color="text.secondary" variant="body2">
          {t('settings.exportImport.summary')}
        </Typography>

        {feedback ? (
          <Alert severity={feedback.severity}>{feedback.message}</Alert>
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
              accept="application/json,.json"
              aria-label={t('settings.exportImport.fields.fileInput')}
              hidden
              onChange={handleFileChange}
              ref={fileInputRef}
              type="file"
            />
          </Button>

          <Button
            disabled={
              !selectedFile ||
              exportDataMutation.isPending ||
              importDataMutation.isPending
            }
            onClick={handleImport}
            variant="contained"
          >
            {importDataMutation.isPending
              ? t('settings.exportImport.actions.importing')
              : t('settings.exportImport.actions.import')}
          </Button>
        </Stack>

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
