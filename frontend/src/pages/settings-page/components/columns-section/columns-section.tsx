import { Alert, Button, CircularProgress, List, Stack, Typography } from '@mui/material';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ColumnDto } from '../../../../types/api';
import { useConfirmation } from '../../../../components/confirmation';
import { useCreateColumnMutation } from '../../hooks/use-create-column-mutation';
import { useDeleteColumnMutation } from '../../hooks/use-delete-column-mutation';
import { useNoteColumnsQuery } from '../../hooks/use-note-columns-query';
import { useReorderColumnsMutation } from '../../hooks/use-reorder-columns-mutation';
import { useUpdateColumnMutation } from '../../hooks/use-update-column-mutation';
import { SettingsSection } from '../settings-section';
import { ColumnDialog } from './components/column-dialog';
import { SortableColumnItem } from './components/sortable-column-item';
import type { ColumnFormValues } from './types/column-form-values';
import { getReorderedColumnIds } from './utils/get-reordered-column-ids.util';

export const ColumnsSection = () => {
  const { t } = useTranslation();
  const confirmation = useConfirmation();
  const [activeColumn, setActiveColumn] = useState<ColumnDto | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const noteColumnsQuery = useNoteColumnsQuery();
  const createColumnMutation = useCreateColumnMutation();
  const updateColumnMutation = useUpdateColumnMutation();
  const reorderColumnsMutation = useReorderColumnsMutation();
  const deleteColumnMutation = useDeleteColumnMutation();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const columns = useMemo(() => {
    return noteColumnsQuery.data ?? [];
  }, [noteColumnsQuery.data]);

  const closeDialog = useCallback(() => {
    setActiveColumn(null);
    setIsDialogOpen(false);
  }, []);

  const openCreateDialog = useCallback(() => {
    setSectionError(null);
    setActiveColumn(null);
    setIsDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((column: ColumnDto) => {
    setSectionError(null);
    setActiveColumn(column);
    setIsDialogOpen(true);
  }, []);

  const handleDialogSubmit = useCallback(
    async (values: ColumnFormValues) => {
      setSectionError(null);

      const payload = {
        isHidden: values.isHidden,
        name: values.name.trim(),
        title: values.title.trim(),
        type: values.type,
      };

      if (activeColumn) {
        await updateColumnMutation.mutateAsync({
          column: payload,
          id: activeColumn.id,
        });
        return;
      }

      await createColumnMutation.mutateAsync(payload);
    },
    [activeColumn, createColumnMutation, updateColumnMutation],
  );

  const handleToggleHidden = useCallback(
    async (column: ColumnDto) => {
      setSectionError(null);

      try {
        await updateColumnMutation.mutateAsync({
          column: { isHidden: !column.isHidden },
          id: column.id,
        });
      } catch {
        setSectionError(t('settings.columns.errors.updateHidden'));
      }
    },
    [t, updateColumnMutation],
  );

  const handleDelete = useCallback(
    async (column: ColumnDto) => {
      const confirmed = await confirmation.confirm({
        confirmLabel: t('settings.columns.confirmDelete.confirm'),
        description: t('settings.columns.confirmDelete.description', {
          title: column.title,
        }),
        title: t('settings.columns.confirmDelete.title'),
        variant: 'destructive',
      });

      if (!confirmed) {
        return;
      }

      setSectionError(null);

      try {
        await deleteColumnMutation.mutateAsync({
          id: column.id,
          query: { deleteMode: 'definitionOnly' },
        });
      } catch {
        setSectionError(t('settings.columns.errors.delete'));
      }
    },
    [confirmation, deleteColumnMutation, t],
  );

  const handleDragEnd = useCallback(
    async ({ active, over }: DragEndEvent) => {
      if (!over || active.id === over.id) {
        return;
      }

      const columnIds = getReorderedColumnIds(
        columns,
        String(active.id),
        String(over.id),
      );

      if (!columnIds) {
        return;
      }

      setSectionError(null);

      try {
        await reorderColumnsMutation.mutateAsync({ columnIds });
      } catch {
        setSectionError(t('settings.columns.errors.reorder'));
      }
    },
    [columns, reorderColumnsMutation, t],
  );


  return (
    <SettingsSection
      description={t('settings.sections.columns.description')}
      title={t('settings.sections.columns.title')}
    >
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
    </SettingsSection>
  );
};
