import {
  Alert,
  Button,
  CircularProgress,
  List,
  Stack,
  Typography,
} from '@mui/material'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColumnDto, DeleteColumnQueryDto } from '../../../../types/api'
import { useConfirmation } from '../../../../components/confirmation'
import { useCreateColumnMutation } from '../../hooks/use-create-column-mutation'
import { useDeleteColumnMutation } from '../../hooks/use-delete-column-mutation'
import { useNoteColumnsQuery } from '../../hooks/use-note-columns-query'
import { useReorderColumnsMutation } from '../../hooks/use-reorder-columns-mutation'
import { useUpdateColumnMutation } from '../../hooks/use-update-column-mutation'
import { SettingsSection } from '../settings-section'
import { ColumnDialog } from './components/column-dialog'
import { SortableColumnItem } from './components/sortable-column-item'
import type { ColumnFormValues } from './types/column-form-values'
import { getReorderedColumnIds } from './utils/get-reordered-column-ids.util'

type ColumnDeleteMode = NonNullable<DeleteColumnQueryDto['deleteMode']>

type ColumnsSectionVariant = 'embedded' | 'section'

interface ColumnsSectionProps {
  noteTypeId: string
  variant?: ColumnsSectionVariant
}

export const ColumnsSection = ({
  noteTypeId,
  variant = 'section',
}: ColumnsSectionProps) => {
  const { t } = useTranslation()
  const confirmation = useConfirmation()
  const [activeColumn, setActiveColumn] = useState<ColumnDto | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [sectionError, setSectionError] = useState<string | null>(null)
  const noteColumnsQuery = useNoteColumnsQuery(noteTypeId)
  const createColumnMutation = useCreateColumnMutation()
  const updateColumnMutation = useUpdateColumnMutation()
  const reorderColumnsMutation = useReorderColumnsMutation()
  const deleteColumnMutation = useDeleteColumnMutation()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const columns = noteColumnsQuery.data ?? []

  const closeDialog = useCallback(() => {
    setActiveColumn(null)
    setIsDialogOpen(false)
  }, [])

  const openCreateDialog = useCallback(() => {
    setSectionError(null)
    setActiveColumn(null)
    setIsDialogOpen(true)
  }, [])

  const openEditDialog = useCallback((column: ColumnDto) => {
    setSectionError(null)
    setActiveColumn(column)
    setIsDialogOpen(true)
  }, [])

  const handleDialogSubmit = useCallback(
    async (values: ColumnFormValues) => {
      setSectionError(null)

      const payload = {
        isHidden: values.isHidden,
        name: values.name.trim(),
        title: values.title.trim(),
        type: values.type,
        config:
          values.type === 'image'
            ? { isMultiImage: values.isMultiImage }
            : null,
      }

      if (activeColumn) {
        await updateColumnMutation.mutateAsync({
          column: payload,
          id: activeColumn.id,
          noteTypeId: activeColumn.noteTypeId,
        })
        return
      }

      await createColumnMutation.mutateAsync({
        column: payload,
        noteTypeId,
      })
    },
    [activeColumn, createColumnMutation, noteTypeId, updateColumnMutation]
  )

  const handleToggleHidden = useCallback(
    async (column: ColumnDto) => {
      setSectionError(null)

      try {
        await updateColumnMutation.mutateAsync({
          column: { isHidden: !column.isHidden },
          id: column.id,
          noteTypeId: column.noteTypeId,
        })
      } catch {
        setSectionError(t('settings.columns.errors.updateHidden'))
      }
    },
    [t, updateColumnMutation]
  )

  const handleDelete = useCallback(
    async (column: ColumnDto) => {
      setSectionError(null)

      const deleteMode = await confirmation.choose<ColumnDeleteMode>({
        cancelLabel: t('settings.columns.confirmDelete.cancel'),
        description: t('settings.columns.confirmDelete.description', {
          title: column.title,
        }),
        title: t('settings.columns.confirmDelete.title'),
        choices: [
          {
            value: 'definitionOnly',
            label: t(
              'settings.columns.confirmDelete.choices.definitionOnly.label'
            ),
            description: t(
              'settings.columns.confirmDelete.choices.definitionOnly.description'
            ),
          },
          {
            value: 'definitionAndValues',
            label: t(
              'settings.columns.confirmDelete.choices.definitionAndValues.label'
            ),
            description: t(
              'settings.columns.confirmDelete.choices.definitionAndValues.description'
            ),
            destructive: true,
          },
        ],
      })

      if (!deleteMode) {
        return
      }

      try {
        await deleteColumnMutation.mutateAsync({
          id: column.id,
          noteTypeId: column.noteTypeId,
          query: { deleteMode },
        })
      } catch {
        setSectionError(t('settings.columns.errors.delete'))
      }
    },
    [confirmation, deleteColumnMutation, t]
  )

  const handleDragEnd = useCallback(
    async ({ active, over }: DragEndEvent) => {
      if (!over || active.id === over.id) {
        return
      }

      const columnIds = getReorderedColumnIds(
        columns,
        String(active.id),
        String(over.id)
      )

      if (!columnIds) {
        return
      }

      setSectionError(null)

      try {
        await reorderColumnsMutation.mutateAsync({
          columnOrder: { columnIds },
          noteTypeId,
        })
      } catch {
        setSectionError(t('settings.columns.errors.reorder'))
      }
    },
    [columns, noteTypeId, reorderColumnsMutation, t]
  )

  const content = (
    <>
      <Stack spacing={2}>
        <Stack
          alignItems={{ sm: 'center', xs: 'stretch' }}
          direction={{ sm: 'row', xs: 'column' }}
          justifyContent="space-between"
          spacing={2}
        >
          <Typography color="text.secondary">
            {t('settings.columns.summary', { count: columns.length })}
          </Typography>
          <Button onClick={openCreateDialog} variant="contained">
            {t('settings.columns.actions.add')}
          </Button>
        </Stack>

        {sectionError ? <Alert severity="error">{sectionError}</Alert> : null}

        {noteColumnsQuery.isLoading ? (
          <Stack alignItems="center" direction="row" spacing={1.5}>
            <CircularProgress size={20} />
            <Typography color="text.secondary">
              {t('settings.columns.status.loading')}
            </Typography>
          </Stack>
        ) : noteColumnsQuery.isError ? (
          <Alert severity="error">{t('settings.columns.status.error')}</Alert>
        ) : columns.length === 0 ? (
          <Alert severity="info">{t('settings.columns.status.empty')}</Alert>
        ) : (
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <SortableContext
              items={columns.map((column) => column.id)}
              strategy={verticalListSortingStrategy}
            >
              <List disablePadding>
                {columns.map((column) => (
                  <SortableColumnItem
                    column={column}
                    key={column.id}
                    onDelete={handleDelete}
                    onEdit={openEditDialog}
                    onToggleHidden={handleToggleHidden}
                  />
                ))}
              </List>
            </SortableContext>
          </DndContext>
        )}

        <Typography color="text.secondary" variant="body2">
          {t('settings.columns.hints.reorder')}
        </Typography>
      </Stack>

      <ColumnDialog
        column={activeColumn ?? undefined}
        columns={columns}
        onClose={closeDialog}
        onSubmit={handleDialogSubmit}
        open={isDialogOpen}
      />
    </>
  )

  if (variant === 'embedded') {
    return content
  }

  return (
    <SettingsSection
      description={t('settings.sections.columns.description')}
      title={t('settings.sections.columns.title')}
    >
      {content}
    </SettingsSection>
  )
}
