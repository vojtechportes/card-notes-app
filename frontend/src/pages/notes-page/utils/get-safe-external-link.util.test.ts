import { describe, expect, it } from 'vitest'
import { getSafeExternalLink } from './get-safe-external-link.util'

describe('getSafeExternalLink', () => {
  it('returns safe external links', () => {
    expect(getSafeExternalLink('https://example.com/docs')).toBe(
      'https://example.com/docs'
    )
    expect(getSafeExternalLink('mailto:hello@example.com')).toBe(
      'mailto:hello@example.com'
    )
  })

  it('rejects unsupported or invalid URLs', () => {
    expect(getSafeExternalLink('javascript:alert(1)')).toBeUndefined()
    expect(getSafeExternalLink('file:///C:/secret.txt')).toBeUndefined()
    expect(getSafeExternalLink('not-a-url')).toBeUndefined()
  })
})
