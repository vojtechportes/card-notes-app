import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { DeveloperToolsPreferencesStore } from '../../src/developer-tools/developer-tools-preferences-store'

test('defaults developer tools to disabled when preferences are missing', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'notestack-developer-tools-'))

  try {
    const store = new DeveloperToolsPreferencesStore(
      path.join(root, 'developer-tools-preferences.json')
    )

    assert.deepEqual(store.getPreferences(), { enabled: false })
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})

test('persists and reloads the developer tools preference atomically', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'notestack-developer-tools-'))
  const preferencesPath = path.join(
    root,
    'preferences',
    'developer-tools-preferences.json'
  )

  try {
    const store = new DeveloperToolsPreferencesStore(preferencesPath)

    assert.deepEqual(store.setEnabled(true), { enabled: true })
    assert.equal(existsSync(`${preferencesPath}.tmp`), false)
    assert.deepEqual(store.getPreferences(), { enabled: true })

    assert.deepEqual(store.setEnabled(false), { enabled: false })
    assert.deepEqual(store.getPreferences(), { enabled: false })
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})

test('malformed and invalid preferences cannot enable developer tools', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'notestack-developer-tools-'))
  const preferencesPath = path.join(root, 'developer-tools-preferences.json')

  try {
    const store = new DeveloperToolsPreferencesStore(preferencesPath)

    writeFileSync(preferencesPath, '{invalid', 'utf8')
    assert.deepEqual(store.getPreferences(), { enabled: false })

    writeFileSync(preferencesPath, JSON.stringify({ enabled: 'yes' }), 'utf8')
    assert.deepEqual(store.getPreferences(), { enabled: false })

    writeFileSync(preferencesPath, JSON.stringify({ other: true }), 'utf8')
    assert.deepEqual(store.getPreferences(), { enabled: false })
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})
