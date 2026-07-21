import { Alert, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { ImportLabelIssueDto } from '../../../../../../types/api'

interface LabelImportIssuesAlertProps {
  issues: ImportLabelIssueDto[]
}

export const LabelImportIssuesAlert = ({
  issues,
}: LabelImportIssuesAlertProps) => {
  const { t } = useTranslation()

  if (issues.length === 0) {
    return null
  }

  return (
    <Alert severity="warning">
      <Stack spacing={1}>
        <Typography variant="body2">
          {t('settings.exportImport.labelIssues.summary')}
        </Typography>
        {issues.map((issue, index) => (
          <Typography
            key={`${issue.code}-${issue.labelId ?? issue.name ?? index}`}
            variant="body2"
          >
            {t(`settings.exportImport.labelIssues.codes.${issue.code}`, {
              label:
                issue.name ??
                issue.labelId ??
                t('settings.exportImport.labelIssues.unknownLabel'),
            })}
          </Typography>
        ))}
      </Stack>
    </Alert>
  )
}
