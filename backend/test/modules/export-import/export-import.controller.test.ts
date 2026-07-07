import { BadRequestException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseService } from '../../../src/modules/database/database.service';
import { ExportImportController } from '../../../src/modules/export-import/export-import.controller';
import { ExportImportService } from '../../../src/modules/export-import/export-import.service';
import { NotesRepository } from '../../../src/modules/notes/notes.repository';
import { NotesService } from '../../../src/modules/notes/notes.service';
import { ColumnsRepository } from '../../../src/modules/settings/columns.repository';
import { GeneralSettingsRepository } from '../../../src/modules/settings/general-settings.repository';
import { SettingsService } from '../../../src/modules/settings/settings.service';
import { ColumnTypeEnum } from '../../../src/modules/settings/types/column-type-enum';

let databaseService: DatabaseService;
let settingsService: SettingsService;
let notesService: NotesService;
let exportImportController: ExportImportController;

beforeEach(() => {
  databaseService = new DatabaseService({ filePath: ':memory:' });
  databaseService.initialize();

  settingsService = new SettingsService(new ColumnsRepository(databaseService), new GeneralSettingsRepository(databaseService));
  settingsService.onModuleInit();
  notesService = new NotesService(new NotesRepository(databaseService), settingsService);
  exportImportController = new ExportImportController(new ExportImportService(databaseService, settingsService, notesService));
});

afterEach(() => {
  databaseService.close();
});

describe(ExportImportController.name, () => {
  it('exports and imports data through the API surface', () => {
    const sourceColumn = settingsService.createColumn({ name: 'sourceUrl', title: 'Source URL', type: ColumnTypeEnum.Link });
    notesService.createNote({ values: { [sourceColumn.id]: 'https://example.com' } });

    const exportedData = exportImportController.exportData();
    const result = exportImportController.importData(exportedData);

    expect(exportedData.columns.map((column) => column.name)).toContain('sourceUrl');
    expect(exportedData.notes).toHaveLength(1);
    expect(result).toEqual({ importedColumns: 3, importedNotes: 1, updatedGeneralSettings: true });
    expect(notesService.listNotes()).toHaveLength(2);
  });

  it('rejects invalid import request bodies', () => {
    const exportedData = exportImportController.exportData();

    expect(() => exportImportController.importData([] as never)).toThrow(BadRequestException);
    expect(() => exportImportController.importData({ ...exportedData, exportedAt: 'not-a-date' })).toThrow(BadRequestException);
    expect(() => exportImportController.importData({ ...exportedData, notes: {} as never })).toThrow(BadRequestException);
  });
});
