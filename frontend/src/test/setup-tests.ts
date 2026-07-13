class IntersectionObserverMock {
  observe() {
    return undefined
  }

  unobserve() {
    return undefined
  }

  disconnect() {
    return undefined
  }
}

class ResizeObserverMock {
  observe() {
    return undefined
  }

  unobserve() {
    return undefined
  }

  disconnect() {
    return undefined
  }
}

globalThis.IntersectionObserver ??=
  IntersectionObserverMock as unknown as typeof IntersectionObserver
globalThis.ResizeObserver ??=
  ResizeObserverMock as unknown as typeof ResizeObserver
