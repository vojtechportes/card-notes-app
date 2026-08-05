import assert from 'node:assert/strict'
import test from 'node:test'
import { parseDeveloperToolsEnabled } from '../../src/developer-tools/utils/parse-developer-tools-enabled.util'

test('developer tools preference accepts only boolean values', () => {
  assert.equal(parseDeveloperToolsEnabled(true), true)
  assert.equal(parseDeveloperToolsEnabled(false), false)

  for (const value of [undefined, null, 0, 1, 'true', {}, []]) {
    assert.throws(
      () => parseDeveloperToolsEnabled(value),
      /developer-tools-invalid-preference/
    )
  }
})
