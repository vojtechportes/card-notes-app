import { afterEach, describe, expect, it } from 'vitest'
import { createDatabaseOptions } from '../../../src/modules/database/database-options'
import { getDefaultDataRoot } from '../../../src/modules/database/utils/get-default-data-root.util'
import { getDefaultDatabasePath } from '../../../src/modules/database/utils/get-default-database-path.util'

const originalDataRoot = process.env.CARD_NOTES_DATA_ROOT
const originalDatabasePath = process.env.CARD_NOTES_DATABASE_PATH

afterEach(() => {
  if (originalDataRoot === undefined) {
    delete process.env.CARD_NOTES_DATA_ROOT
  } else {
    process.env.CARD_NOTES_DATA_ROOT = originalDataRoot
  }

  if (originalDatabasePath === undefined) {
    delete process.env.CARD_NOTES_DATABASE_PATH
  } else {
    process.env.CARD_NOTES_DATABASE_PATH = originalDatabasePath
  }
})

describe('application data root', () => {
  it('derives the database path from the shared Electron-provided root', () => {
    process.env.CARD_NOTES_DATA_ROOT = 'C:\\portable\\notestack'
    delete process.env.CARD_NOTES_DATABASE_PATH

    expect(getDefaultDataRoot()).toBe('C:\\portable\\notestack')
    expect(getDefaultDatabasePath()).toBe(
      'C:\\portable\\notestack\\card-notes.sqlite'
    )
    expect(createDatabaseOptions()).toEqual({
      filePath: 'C:\\portable\\notestack\\card-notes.sqlite',
    })
  })

  it('keeps an explicit database path override', () => {
    process.env.CARD_NOTES_DATA_ROOT = 'C:\\portable\\notestack'
    process.env.CARD_NOTES_DATABASE_PATH = 'C:\\override\\notes.sqlite'

    expect(createDatabaseOptions()).toEqual({
      filePath: 'C:\\override\\notes.sqlite',
    })
  })
})
