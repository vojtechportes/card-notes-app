import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { UpdaterPreferencesStore } from '../../src/updater/updater-preferences-store'

test('defaults prerelease updates to disabled when preferences are missing', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'notestack-updater-'))

  try {
    const store = new UpdaterPreferencesStore(
      path.join(root, 'updater-preferences.json')
    )

    assert.deepEqual(store.getPreferences(), { allowPrerelease: false })
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})

test('persists and reloads the prerelease update preference', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'notestack-updater-'))
  const preferencesPath = path.join(root, 'updater-preferences.json')

  try {
    const store = new UpdaterPreferencesStore(preferencesPath)

    store.setAllowPrerelease(true)
    assert.equal(existsSync(preferencesPath + '.tmp'), false)
    assert.deepEqual(store.getPreferences(), { allowPrerelease: true })

    store.setAllowPrerelease(false)
    assert.equal(existsSync(preferencesPath + '.tmp'), false)
    assert.deepEqual(store.getPreferences(), { allowPrerelease: false })
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})

test('falls back safely when persisted preferences are malformed', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'notestack-updater-'))
  const preferencesPath = path.join(root, 'updater-preferences.json')

  try {
    writeFileSync(preferencesPath, '{invalid', 'utf8')

    const store = new UpdaterPreferencesStore(preferencesPath)

    assert.deepEqual(store.getPreferences(), { allowPrerelease: false })

    writeFileSync(preferencesPath, JSON.stringify({ allowPrerelease: 'yes' }))
    assert.deepEqual(store.getPreferences(), { allowPrerelease: false })
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})
