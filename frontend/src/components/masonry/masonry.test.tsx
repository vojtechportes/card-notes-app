import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Masonry } from './masonry'

const setWindowWidth = (width: number): void => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
  })
}

const getMasonryRoot = (container: HTMLElement): HTMLElement | null => {
  return container.firstElementChild as HTMLElement | null
}

describe('Masonry', () => {
  afterEach(() => {
    cleanup()
    setWindowWidth(1024)
  })

  it('renders children in source order within balanced CSS columns', () => {
    setWindowWidth(800)

    const { container } = render(
      <Masonry columns={{ xs: 1, md: 2 }} gap={12}>
        <span key="alpha">Alpha</span>
        <span key="beta">Beta</span>
        <span key="gamma">Gamma</span>
        <span key="delta">Delta</span>
      </Masonry>
    )

    const masonry = getMasonryRoot(container)
    const masonryStyle = getComputedStyle(masonry as HTMLElement)

    expect(masonry?.children).toHaveLength(4)
    expect(masonry?.textContent).toBe('AlphaBetaGammaDelta')
    expect(masonryStyle.columnCount).toBe('2')
    expect(masonryStyle.columnGap).toBe('12px')
  })

  it('keeps each item intact and applies vertical spacing', () => {
    const { container } = render(
      <Masonry columns={2} gap={16}>
        <span>Alpha</span>
      </Masonry>
    )

    const masonry = getMasonryRoot(container)
    const item = masonry?.firstElementChild as HTMLElement | null
    const itemStyle = getComputedStyle(item as HTMLElement)

    expect(itemStyle.breakInside).toBe('avoid')
    expect(itemStyle.display).toBe('inline-block')
    expect(itemStyle.marginBottom).toBe('16px')
    expect(itemStyle.width).toBe('100%')
  })

  it('updates the CSS column count after window resize', () => {
    setWindowWidth(320)

    const { container } = render(
      <Masonry columns={{ xs: 1, md: 2 }}>
        <span key="alpha">Alpha</span>
        <span key="beta">Beta</span>
      </Masonry>
    )

    const masonry = getMasonryRoot(container)

    expect(getComputedStyle(masonry as HTMLElement).columnCount).toBe('1')

    setWindowWidth(800)

    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    expect(getComputedStyle(masonry as HTMLElement).columnCount).toBe('2')
  })
})
