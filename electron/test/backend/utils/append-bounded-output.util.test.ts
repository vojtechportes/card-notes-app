import assert from 'node:assert/strict'
import test from 'node:test'
import { appendBoundedOutput } from '../../../src/backend/utils/append-bounded-output.util'

test('appends output while it remains within the limit', () => {
  assert.equal(appendBoundedOutput('first', ' second', 20), 'first second')
})

test('keeps the most recent output when the limit is exceeded', () => {
  assert.equal(appendBoundedOutput('12345', '67890', 6), '567890')
})

test('returns an empty string for a non-positive limit', () => {
  assert.equal(appendBoundedOutput('existing', 'new', 0), '')
})
