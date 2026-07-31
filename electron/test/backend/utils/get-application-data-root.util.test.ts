import assert from 'node:assert/strict'
import test from 'node:test'
import { getApplicationDataRoot } from '../../../src/backend/utils/get-application-data-root.util'

test('keeps the legacy application directory under Electron appData', () => {
  assert.equal(
    getApplicationDataRoot('C:\\Users\\user\\AppData\\Roaming'),
    'C:\\Users\\user\\AppData\\Roaming\\card-notes-app'
  )
})
