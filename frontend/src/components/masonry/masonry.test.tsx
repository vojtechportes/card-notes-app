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

  it('distributes children across responsive columns', () => {
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

    expect(masonry?.children).toHaveLength(2)
    expect(masonry?.children[0]?.textContent).toBe('AlphaGamma')
    expect(masonry?.children[1]?.textContent).toBe('BetaDelta')
  })

  it('updates column distribution after window resize', () => {
    setWindowWidth(320)

    const { container } = render(
      <Masonry columns={{ xs: 1, md: 2 }}>
        <span key="alpha">Alpha</span>
        <span key="beta">Beta</span>
      </Masonry>
    )

    const masonry = getMasonryRoot(container)

    expect(masonry?.children).toHaveLength(1)

    setWindowWidth(800)

    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    expect(masonry?.children).toHaveLength(2)
  })
})
