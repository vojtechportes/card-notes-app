import assert from 'node:assert/strict'
import test from 'node:test'
import { addNoteStackRuntimeMarker } from '../../../src/runtime/utils/add-note-stack-runtime-marker.util.js'

test('adds the NoteStack runtime marker while preserving URL state', () => {
  const markedUrl = new URL(
    addNoteStackRuntimeMarker('http://localhost:5173/notes?view=cards#recent')
  )

  assert.equal(markedUrl.origin, 'http://localhost:5173')
  assert.equal(markedUrl.pathname, '/notes')
  assert.equal(markedUrl.searchParams.get('view'), 'cards')
  assert.equal(markedUrl.searchParams.get('notestack-runtime'), 'electron')
  assert.equal(markedUrl.hash, '#recent')
})

test('replaces an existing NoteStack runtime marker', () => {
  const markedUrl = new URL(
    addNoteStackRuntimeMarker(
      'http://localhost:5173/?notestack-runtime=browser'
    )
  )

  assert.deepEqual(markedUrl.searchParams.getAll('notestack-runtime'), [
    'electron',
  ])
})
