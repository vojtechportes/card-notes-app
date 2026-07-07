import { BadRequestException, NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseService } from '../../../src/modules/database/database.service';
import { GeneralSettingsRepository } from '../../../src/modules/settings/general-settings.repository';
import { ColumnsRepository } from '../../../src/modules/settings/columns.repository';
import { SettingsController } from '../../../src/modules/settings/settings.controller';
import { SettingsService } from '../../../src/modules/settings/settings.service';
import { ColumnDeleteModeEnum } from '../../../src/modules/settings/types/column-delete-mode-enum';
import { ColumnTypeEnum } from '../../../src/modules/settings/types/column-type-enum';

let databaseService: DatabaseService;
let settingsController: SettingsController;

beforeEach(() => {
  databaseService = new DatabaseService({ filePath: ':memory:' });
  databaseService.initialize();

  const settingsService = new SettingsService(new ColumnsRepository(databaseService), new GeneralSettingsRepository(databaseService));
  settingsService.onModuleInit();
  settingsController = new SettingsController(settingsService);
});

afterEach(() => {
  databaseService.close();
});

describe(SettingsController.name, () => {
  it('creates, lists, updates, hides, and reorders columns through the API surface', () => {
    const summaryColumn = settingsController.createColumn({
      name: 'summary',
      title: 'Summary',
      type: ColumnTypeEnum.Text,
    });
    const ratingColumn = settingsController.createColumn({
      name: 'rating',
      title: 'Rating',
      type: ColumnTypeEnum.Number,
      isHidden: true,
    });

    expect(settingsController.listColumns().map((column) => column.name)).toEqual(['createdAt', 'updatedAt', 'summary', 'rating']);

    const updatedColumn = settingsController.updateColumn(summaryColumn.id, {
      title: 'Summary text',
      isHidden: true,
      config: { multiline: true },
    });

    expect(updatedColumn).toEqual(
      expect.objectContaining({
        id: summaryColumn.id,
        title: 'Summary text',
        isHidden: true,
        config: { multiline: true },
      }),
    );

    const defaultColumns = settingsController.listColumns().filter((column) => column.isDefault);
    expect(settingsController.reorderColumns({ columnIds: [ratingColumn.id, summaryColumn.id, defaultColumns[1].id, defaultColumns[0].id] }).map((column) => column.id)).toEqual([
      ratingColumn.id,
      summaryColumn.id,
      defaultColumns[1].id,
      defaultColumns[0].id,
    ]);
  });

  it('deletes columns with definition-only mode by default', () => {
    const column = settingsController.createColumn({ name: 'sourceUrl', title: 'Source URL', type: ColumnTypeEnum.Link });

    databaseService
      .getConnection()
      .prepare("INSERT INTO notes (id, created_at, updated_at) VALUES ('note-1', '2026-07-07T10:00:00.000Z', '2026-07-07T10:00:00.000Z')")
      .run();
    databaseService
      .getConnection()
      .prepare('INSERT INTO note_values (note_id, column_id, value_json) VALUES (?, ?, ?)')
      .run('note-1', column.id, JSON.stringify('https://example.com'));

    settingsController.deleteColumn(column.id);

    const remainingValues = databaseService.getConnection().prepare('SELECT COUNT(*) as count FROM note_values WHERE column_id = ?').get(column.id) as {
      count: number;
    };
    expect(remainingValues.count).toBe(1);
  });

  it('deletes column note values when requested through delete mode', () => {
    const column = settingsController.createColumn({ name: 'rating', title: 'Rating', type: ColumnTypeEnum.Number });

    databaseService
      .getConnection()
      .prepare("INSERT INTO notes (id, created_at, updated_at) VALUES ('note-1', '2026-07-07T10:00:00.000Z', '2026-07-07T10:00:00.000Z')")
      .run();
    databaseService
      .getConnection()
      .prepare('INSERT INTO note_values (note_id, column_id, value_json) VALUES (?, ?, ?)')
      .run('note-1', column.id, JSON.stringify(7));

    settingsController.deleteColumn(column.id, { deleteMode: ColumnDeleteModeEnum.DefinitionAndValues });

    const remainingValues = databaseService.getConnection().prepare('SELECT COUNT(*) as count FROM note_values WHERE column_id = ?').get(column.id) as {
      count: number;
    };
    expect(remainingValues.count).toBe(0);
  });

  it('gets and updates general settings through the API surface', () => {
    expect(settingsController.getGeneralSettings()).toEqual({
      textTruncationLength: null,
      cardFieldDisplayCount: null,
    });

    expect(settingsController.updateGeneralSettings({ textTruncationLength: 80, cardFieldDisplayCount: 3 })).toEqual({
      textTruncationLength: 80,
      cardFieldDisplayCount: 3,
    });
    expect(settingsController.updateGeneralSettings({ cardFieldDisplayCount: null })).toEqual({
      textTruncationLength: 80,
      cardFieldDisplayCount: null,
    });
  });

  it('rejects malformed settings request payloads and query values', () => {
    const [defaultColumn] = settingsController.listColumns();

    expect(() => settingsController.createColumn(null as never)).toThrow(BadRequestException);
    expect(() => settingsController.createColumn({ name: 'summary', title: 'Summary', type: 'unsupported' as ColumnTypeEnum })).toThrow(BadRequestException);
    expect(() => settingsController.createColumn({ name: 1 as never, title: 'Summary', type: ColumnTypeEnum.Text })).toThrow(BadRequestException);
    expect(() => settingsController.updateColumn(defaultColumn.id, [] as never)).toThrow(BadRequestException);
    expect(() => settingsController.reorderColumns({ columnIds: ['one', 2 as never] })).toThrow(BadRequestException);
    expect(() => settingsController.deleteColumn(defaultColumn.id, { deleteMode: 'everything' as ColumnDeleteModeEnum })).toThrow(BadRequestException);
    expect(() => settingsController.updateGeneralSettings({ textTruncationLength: 'many' as never })).toThrow(BadRequestException);
    expect(() => settingsController.updateGeneralSettings({ cardFieldDisplayCount: -1 })).toThrow(BadRequestException);
  });

  it('throws when updating or deleting unknown columns', () => {
    expect(() => settingsController.updateColumn('missing-column-id', { title: 'Missing' })).toThrow(NotFoundException);
    expect(() => settingsController.deleteColumn('missing-column-id')).toThrow(NotFoundException);
  });
});
