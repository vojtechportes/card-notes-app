import { describe, expect, it } from 'vitest'
import { resolveNoteImageSource } from './resolve-note-image-source.util'

describe('resolveNoteImageSource', () => {
  it('returns safe local image sources', () => {
    expect(
      resolveNoteImageSource({
        dataUrl: 'data:image/png;base64,abc123',
      })
    ).toBe('data:image/png;base64,abc123')

    expect(
      resolveNoteImageSource({
        path: 'C:\\Users\\vojta\\Pictures\\receipt.png',
      })
    ).toBe('file:///C:/Users/vojta/Pictures/receipt.png')

    expect(
      resolveNoteImageSource({
        url: 'file:///tmp/note-image.png',
      })
    ).toBe('file:///tmp/note-image.png')
  })

  it('rejects remote or unsupported image sources', () => {
    expect(
      resolveNoteImageSource({
        url: 'https://example.com/receipt.png',
      })
    ).toBeUndefined()

    expect(
      resolveNoteImageSource({
        dataUrl: 'data:text/html;base64,abc123',
      })
    ).toBeUndefined()

    expect(
      resolveNoteImageSource({
        path: 'receipt.png',
      })
    ).toBeUndefined()
  })
})
