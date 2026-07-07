import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { DatabaseService } from '../../../src/modules/database/database.service';
import { NotesRepository } from '../../../src/modules/notes/notes.repository';
import { NotesService } from '../../../src/modules/notes/notes.service';
import { NoteSortDirectionEnum } from '../../../src/modules/notes/types/note-sort-direction-enum';
import { NoteSortFieldEnum } from '../../../src/modules/notes/types/note-sort-field-enum';
import { ColumnsRepository } from '../../../src/modules/settings/columns.repository';
import { GeneralSettingsRepository } from '../../../src/modules/settings/general-settings.repository';
import { SettingsService } from '../../../src/modules/settings/settings.service';
import { ColumnTypeEnum } from '../../../src/modules/settings/types/column-type-enum';

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let databaseService: DatabaseService;
let settingsService: SettingsService;
let notesService: NotesService;

beforeEach(() => {
  databaseService = new DatabaseService({ filePath: ':memory:' });
  databaseService.initialize();

  settingsService = new SettingsService(new ColumnsRepository(databaseService), new GeneralSettingsRepository(databaseService));
  settingsService.onModuleInit();
  notesService = new NotesService(new NotesRepository(databaseService), settingsService);
});

afterEach(() => {
  databaseService.close();
});

describe(NotesService.name, () => {
  it('creates notes with uuid ids, timestamps, and values keyed by column id', () => {
    const summaryColumn = settingsService.createColumn({
      name: 'summary',
      title: 'Summary',
      type: ColumnTypeEnum.Text,
    });
    const ratingColumn = settingsService.createColumn({
      name: 'rating',
      title: 'Rating',
      type: ColumnTypeEnum.Number,
    });

    const note = notesService.createNote({
      values: {
        [summaryColumn.id]: 'A compact note',
        [ratingColumn.id]: 4,
      },
    });

    expect(note.id).toMatch(uuidV4Pattern);
    expect(note.createdAt).toBeTruthy();
    expect(note.updatedAt).toBeTruthy();
    expect(note.values).toEqual({
      [summaryColumn.id]: 'A compact note',
      [ratingColumn.id]: 4,
    });
    expect(notesService.getNote(note.id)).toEqual(note);
  });

  it('round-trips supported text, date, number, link, and image values', () => {
    const textColumn = settingsService.createColumn({ name: 'summary', title: 'Summary', type: ColumnTypeEnum.Text });
    const dateColumn = settingsService.createColumn({ name: 'reviewedOn', title: 'Reviewed on', type: ColumnTypeEnum.Date });
    const numberColumn = settingsService.createColumn({ name: 'rating', title: 'Rating', type: ColumnTypeEnum.Number });
    const linkColumn = settingsService.createColumn({ name: 'sourceUrl', title: 'Source URL', type: ColumnTypeEnum.Link });
    const imageColumn = settingsService.createColumn({ name: 'coverImage', title: 'Cover image', type: ColumnTypeEnum.Image });

    const note = notesService.createNote({
      values: {
        [textColumn.id]: 'Round trip',
        [dateColumn.id]: '2026-07-07',
        [numberColumn.id]: 10,
        [linkColumn.id]: 'https://example.com/source',
        [imageColumn.id]: {
          fileName: 'cover.png',
          mimeType: 'image/png',
          size: 1024,
          dataUrl: 'data:image/png;base64,abc123',
          width: 320,
          height: 200,
        },
      },
    });

    expect(notesService.getNote(note.id).values).toEqual(note.values);
  });

  it('stores createdAt and updatedAt as note fields instead of note values', () => {
    const [createdAtColumn, updatedAtColumn] = settingsService.listColumns();

    expect(() =>
      notesService.createNote({
        values: {
          [createdAtColumn.id]: '2026-07-07',
        },
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      notesService.createNote({
        values: {
          [updatedAtColumn.id]: '2026-07-07',
        },
      }),
    ).toThrow(BadRequestException);
  });

  it('updates provided values without deleting unrelated values and supports explicit value removal', () => {
    const summaryColumn = settingsService.createColumn({ name: 'summary', title: 'Summary', type: ColumnTypeEnum.Text });
    const ratingColumn = settingsService.createColumn({ name: 'rating', title: 'Rating', type: ColumnTypeEnum.Number });
    const sourceColumn = settingsService.createColumn({ name: 'sourceUrl', title: 'Source URL', type: ColumnTypeEnum.Link });
    const note = notesService.createNote({
      values: {
        [summaryColumn.id]: 'Original summary',
        [ratingColumn.id]: 2,
        [sourceColumn.id]: 'https://example.com/original',
      },
    });

    const updatedNote = notesService.updateNote(note.id, {
      values: {
        [summaryColumn.id]: 'Updated summary',
        [sourceColumn.id]: null,
      },
    });

    expect(updatedNote.values).toEqual({
      [summaryColumn.id]: 'Updated summary',
      [ratingColumn.id]: 2,
    });
    expect(new Date(updatedNote.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(note.updatedAt).getTime());
  });

  it('preserves note values when a column definition is deleted', () => {
    const imageColumn = settingsService.createColumn({ name: 'image', title: 'Image', type: ColumnTypeEnum.Image });
    const note = notesService.createNote({
      values: {
        [imageColumn.id]: {
          fileName: 'dropped.png',
          dataUrl: 'data:image/png;base64,dropped',
        },
      },
    });

    settingsService.deleteColumn(imageColumn.id);

    expect(notesService.getNote(note.id).values).toEqual({
      [imageColumn.id]: {
        fileName: 'dropped.png',
        dataUrl: 'data:image/png;base64,dropped',
      },
    });
  });

  it('rejects null values when creating a note', () => {
    const summaryColumn = settingsService.createColumn({ name: 'summary', title: 'Summary', type: ColumnTypeEnum.Text });

    expect(() =>
      notesService.createNote({
        values: {
          [summaryColumn.id]: null as never,
        },
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects values for unknown columns', () => {
    expect(() =>
      notesService.createNote({
        values: {
          'missing-column-id': 'Missing',
        },
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects values that do not match the configured column type', () => {
    const ratingColumn = settingsService.createColumn({ name: 'rating', title: 'Rating', type: ColumnTypeEnum.Number });
    const imageColumn = settingsService.createColumn({ name: 'image', title: 'Image', type: ColumnTypeEnum.Image });

    expect(() =>
      notesService.createNote({
        values: {
          [ratingColumn.id]: 'high' as never,
        },
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      notesService.createNote({
        values: {
          [imageColumn.id]: { fileName: 'missing-source.png' },
        },
      }),
    ).toThrow(BadRequestException);
  });

  it('throws when updating or deleting an unknown note', () => {
    expect(() => notesService.getNote('missing-note-id')).toThrow(NotFoundException);
    expect(() => notesService.updateNote('missing-note-id', { values: {} })).toThrow(NotFoundException);
    expect(() => notesService.deleteNote('missing-note-id')).toThrow(NotFoundException);
  });

  it('deletes values for a column only when explicitly requested', () => {
    const summaryColumn = settingsService.createColumn({ name: 'summary', title: 'Summary', type: ColumnTypeEnum.Text });
    const ratingColumn = settingsService.createColumn({ name: 'rating', title: 'Rating', type: ColumnTypeEnum.Number });
    const note = notesService.createNote({
      values: {
        [summaryColumn.id]: 'Keep me',
        [ratingColumn.id]: 5,
      },
    });

    expect(notesService.deleteValuesForColumn(ratingColumn.id)).toBe(1);

    expect(notesService.getNote(note.id).values).toEqual({
      [summaryColumn.id]: 'Keep me',
    });
  });

  it('lists notes sorted by createdAt and updatedAt in the requested direction', () => {
    const summaryColumn = settingsService.createColumn({ name: 'summary', title: 'Summary', type: ColumnTypeEnum.Text });
    const firstNote = notesService.createNote({ values: { [summaryColumn.id]: 'First' } });
    const secondNote = notesService.createNote({ values: { [summaryColumn.id]: 'Second' } });

    databaseService
      .getConnection()
      .prepare('UPDATE notes SET created_at = ?, updated_at = ? WHERE id = ?')
      .run('2026-07-01T10:00:00.000Z', '2026-07-03T10:00:00.000Z', firstNote.id);
    databaseService
      .getConnection()
      .prepare('UPDATE notes SET created_at = ?, updated_at = ? WHERE id = ?')
      .run('2026-07-02T10:00:00.000Z', '2026-07-04T10:00:00.000Z', secondNote.id);

    expect(
      notesService
        .listNotes({ sortBy: NoteSortFieldEnum.CreatedAt, sortDirection: NoteSortDirectionEnum.Asc })
        .map((note) => note.id),
    ).toEqual([firstNote.id, secondNote.id]);
    expect(
      notesService
        .listNotes({ sortBy: NoteSortFieldEnum.CreatedAt, sortDirection: NoteSortDirectionEnum.Desc })
        .map((note) => note.id),
    ).toEqual([secondNote.id, firstNote.id]);
    expect(
      notesService
        .listNotes({ sortBy: NoteSortFieldEnum.UpdatedAt, sortDirection: NoteSortDirectionEnum.Asc })
        .map((note) => note.id),
    ).toEqual([firstNote.id, secondNote.id]);
    expect(
      notesService
        .listNotes({ sortBy: NoteSortFieldEnum.UpdatedAt, sortDirection: NoteSortDirectionEnum.Desc })
        .map((note) => note.id),
    ).toEqual([secondNote.id, firstNote.id]);
  });

  it('deletes notes and cascades their values', () => {
    const summaryColumn = settingsService.createColumn({ name: 'summary', title: 'Summary', type: ColumnTypeEnum.Text });
    const note = notesService.createNote({ values: { [summaryColumn.id]: 'Delete me' } });

    notesService.deleteNote(note.id);

    expect(notesService.listNotes()).toEqual([]);
    expect(() => notesService.getNote(note.id)).toThrow(NotFoundException);
  });
});
