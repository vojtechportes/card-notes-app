import { describe, expect, it } from 'vitest'
import { sharedLabelSourceValue } from '../constants/shared-label-source-value'
import { mapLabelFormValuesToPayload } from './map-label-form-values-to-payload.util'

describe('mapLabelFormValuesToPayload', () => {
  it('trims values and maps the shared source to null', () => {
    expect(
      mapLabelFormValuesToPayload({
        color: ' #0070F2 ',
        name: ' priority ',
        noteTypeId: sharedLabelSourceValue,
        title: ' Priority ',
      })
    ).toEqual({
      color: '#0070F2',
      name: 'priority',
      noteTypeId: null,
      title: 'Priority',
    })
  })

  it('preserves a note template source id', () => {
    expect(
      mapLabelFormValuesToPayload({
        color: '#188918',
        name: 'done',
        noteTypeId: 'note-type-1',
        title: 'Done',
      })
    ).toEqual({
      color: '#188918',
      name: 'done',
      noteTypeId: 'note-type-1',
      title: 'Done',
    })
  })
})
