import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import { Alert, Button, Paper, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useResolveSyncConflictMutation } from '../../../../../hooks/sync/use-resolve-sync-conflict-mutation'
import type { SyncConflictDto } from '../../../../../types/api'
import { SyncConflictInspectDialog } from './sync-conflict-inspect-dialog'

interface SyncConflictItemProps {
  conflict: SyncConflictDto
}

export const SyncConflictItem = ({ conflict }: SyncConflictItemProps) => {
  const { t } = useTranslation()
  const [isInspecting, setIsInspecting] = useState(false)
  const resolveMutation = useResolveSyncConflictMutation()
  const fieldNames = conflict.fieldPaths.length
    ? conflict.fieldPaths.join(', ')
    : t('settings.synchronization.conflicts.wholeItem')

  const resolveWith = (
    resolutionState: 'resolved-local' | 'resolved-remote'
  ) => {
    resolveMutation.mutate({
      id: conflict.id,
      resolution: { resolutionState },
    })
  }

  return (
    <>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Stack alignItems="center" direction="row" spacing={1}>
            <WarningAmberOutlinedIcon color="warning" />
            <Typography component="h4" fontWeight={700}>
              {t(
                `settings.synchronization.conflicts.entities.${conflict.entityKind}`
              )}
            </Typography>
          </Stack>
          <Typography>
            {t(
              `settings.synchronization.conflicts.types.${conflict.conflictType}`
            )}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {t('settings.synchronization.conflicts.fields', {
              fields: fieldNames,
            })}
          </Typography>
          {conflict.conflictCopyEntityId ? (
            <Alert severity="info">
              {t('settings.synchronization.conflicts.copyPreserved')}
            </Alert>
          ) : null}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button
              disabled={resolveMutation.isPending}
              onClick={() => setIsInspecting(true)}
              variant="outlined"
            >
              {t('settings.synchronization.conflicts.inspect')}
            </Button>
            <Button
              disabled={resolveMutation.isPending}
              onClick={() => resolveWith('resolved-local')}
              variant="contained"
            >
              {t('settings.synchronization.conflicts.keepLocal')}
            </Button>
            <Button
              disabled={resolveMutation.isPending}
              onClick={() => resolveWith('resolved-remote')}
              variant="outlined"
            >
              {t('settings.synchronization.conflicts.useCloud')}
            </Button>
            {conflict.conflictCopyEntityId ? (
              <Button
                disabled={resolveMutation.isPending}
                onClick={() =>
                  resolveMutation.mutate({
                    id: conflict.id,
                    resolution: {
                      resolutionState: 'resolved-merged',
                      retainBoth: true,
                    },
                  })
                }
                variant="outlined"
              >
                {t('settings.synchronization.conflicts.retainBoth')}
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Paper>
      <SyncConflictInspectDialog
        conflict={isInspecting ? conflict : null}
        onClose={() => setIsInspecting(false)}
      />
    </>
  )
}
