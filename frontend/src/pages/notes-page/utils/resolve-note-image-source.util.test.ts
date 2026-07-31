import { describe, expect, it } from 'vitest'
import { apiClient } from '../../../utils/api-client'
import { resolveNoteImageSource } from './resolve-note-image-source.util'

describe('resolveNoteImageSource', () => {
  it('resolves managed assets against the runtime backend URL', () => {
    const previousBaseUrl = apiClient.defaults.baseURL
    apiClient.defaults.baseURL = 'http://127.0.0.1:4312/api'

    try {
      expect(
        resolveNoteImageSource({
          assetId:
            'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          fileName: 'receipt.png',
          mimeType: 'image/png',
          size: 100,
        })
      ).toBe(
        'http://127.0.0.1:4312/api/assets/' +
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' +
          '/content'
      )
    } finally {
      apiClient.defaults.baseURL = previousBaseUrl
    }
  })

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
