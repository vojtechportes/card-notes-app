import { BadRequestException, NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseService } from '../../../src/modules/database/database.service';
import { NotesController } from '../../../src/modules/notes/notes.controller';
import { NotesRepository } from '../../../src/modules/notes/notes.repository';
import { NotesService } from '../../../src/modules/notes/notes.service';
import { NoteSortDirectionEnum } from '../../../src/modules/notes/types/note-sort-direction-enum';
import { NoteSortFieldEnum } from '../../../src/modules/notes/types/note-sort-field-enum';
import { ColumnsRepository } from '../../../src/modules/settings/columns.repository';
import { GeneralSettingsRepository } from '../../../src/modules/settings/general-settings.repository';
import { SettingsService } from '../../../src/modules/settings/settings.service';
import { ColumnTypeEnum } from '../../../src/modules/settings/types/column-type-enum';

let databaseService: DatabaseService;
let settingsService: SettingsService;
let notesController: NotesController;

beforeEach(() => {
  databaseService = new DatabaseService({ filePath: ':memory:' });
  databaseService.initialize();

  settingsService = new SettingsService(new ColumnsRepository(databaseService), new GeneralSettingsRepository(databaseService));
  settingsService.onModuleInit();
  notesController = new NotesController(new NotesService(new NotesRepository(databaseService), settingsService));
});

afterEach(() => {
  databaseService.close();
});

describe(NotesController.name, () => {
  it('creates and reads notes through the API surface', () => {
    const summaryColumn = settingsService.createColumn({ name: 'summary', title: 'Summary', type: ColumnTypeEnum.Text });

    const createdNote = notesController.createNote({ values: { [summaryColumn.id]: 'API note' } });

    expect(createdNote.values).toEqual({ [summaryColumn.id]: 'API note' });
    expect(notesController.getNote(createdNote.id)).toEqual(createdNote);
  });

  it('lists notes with default and explicit sort query options', () => {
    const summaryColumn = settingsService.createColumn({ name: 'summary', title: 'Summary', type: ColumnTypeEnum.Text });
    const firstNote = notesController.createNote({ values: { [summaryColumn.id]: 'First' } });
    const secondNote = notesController.createNote({ values: { [summaryColumn.id]: 'Second' } });

    databaseService
      .getConnection()
      .prepare('UPDATE notes SET created_at = ?, updated_at = ? WHERE id = ?')
      .run('2026-07-01T10:00:00.000Z', '2026-07-04T10:00:00.000Z', firstNote.id);
    databaseService
      .getConnection()
      .prepare('UPDATE notes SET created_at = ?, updated_at = ? WHERE id = ?')
      .run('2026-07-02T10:00:00.000Z', '2026-07-03T10:00:00.000Z', secondNote.id);

    expect(notesController.listNotes({}).map((note) => note.id)).toEqual([secondNote.id, firstNote.id]);
    expect(
      notesController
        .listNotes({ sortBy: NoteSortFieldEnum.CreatedAt, sortDirection: NoteSortDirectionEnum.Asc })
        .map((note) => note.id),
    ).toEqual([firstNote.id, secondNote.id]);
    expect(
      notesController
        .listNotes({ sortBy: NoteSortFieldEnum.UpdatedAt, sortDirection: NoteSortDirectionEnum.Desc })
        .map((note) => note.id),
    ).toEqual([firstNote.id, secondNote.id]);
  });

  it('updates note values and removes values through null patches', () => {
    const summaryColumn = settingsService.createColumn({ name: 'summary', title: 'Summary', type: ColumnTypeEnum.Text });
    const sourceColumn = settingsService.createColumn({ name: 'sourceUrl', title: 'Source URL', type: ColumnTypeEnum.Link });
    const note = notesController.createNote({
      values: {
        [summaryColumn.id]: 'Original',
        [sourceColumn.id]: 'https://example.com',
      },
    });

    const updatedNote = notesController.updateNote(note.id, {
      values: {
        [summaryColumn.id]: 'Updated',
        [sourceColumn.id]: null,
      },
    });

    expect(updatedNote.values).toEqual({ [summaryColumn.id]: 'Updated' });
  });

  it('deletes notes through the API surface', () => {
    const note = notesController.createNote({});

    notesController.deleteNote(note.id);

    expect(() => notesController.getNote(note.id)).toThrow(NotFoundException);
  });

  it('deletes all notes through the explicit destructive API surface', () => {
    notesController.createNote({});
    notesController.createNote({});

    expect(notesController.deleteAllNotes()).toEqual({ deletedCount: 2 });
    expect(notesController.listNotes({})).toEqual([]);
    expect(notesController.deleteAllNotes()).toEqual({ deletedCount: 0 });
  });

  it('rejects malformed create and update request bodies', () => {
    const note = notesController.createNote({});

    expect(() => notesController.createNote(null as never)).toThrow(BadRequestException);
    expect(() => notesController.createNote([] as never)).toThrow(BadRequestException);
    expect(() => notesController.createNote({ values: [] as never })).toThrow(BadRequestException);
    expect(() => notesController.createNote({ values: null as never })).toThrow(BadRequestException);
    expect(() => notesController.updateNote(note.id, null as never)).toThrow(BadRequestException);
    expect(() => notesController.updateNote(note.id, [] as never)).toThrow(BadRequestException);
    expect(() => notesController.updateNote(note.id, { values: [] as never })).toThrow(BadRequestException);
    expect(() => notesController.updateNote(note.id, { values: null as never })).toThrow(BadRequestException);
  });
  it('rejects invalid sort query values', () => {
    expect(() => notesController.listNotes({ sortBy: 'title' as NoteSortFieldEnum })).toThrow(BadRequestException);
    expect(() => notesController.listNotes({ sortDirection: 'sideways' as NoteSortDirectionEnum })).toThrow(BadRequestException);
  });
});
