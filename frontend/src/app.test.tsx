import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { App } from './app'
import './i18n'

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

globalThis.IntersectionObserver =
  IntersectionObserverMock as unknown as typeof IntersectionObserver

describe('App routing', () => {
  afterEach(() => {
    cleanup()
    window.location.hash = ''
  })

  it('redirects the home route to notes', async () => {
    window.location.hash = ''

    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Notes' })).toBeTruthy()
    await waitFor(() => expect(window.location.hash).toBe('#/notes'))
  })

  it('renders settings from the settings route', async () => {
    window.location.hash = '#/settings'

    render(<App />)

    expect(
      await screen.findByRole('heading', { name: 'Settings' })
    ).toBeTruthy()
  })

  it('renders notes from a note detail route and still allows navigation to settings', async () => {
    window.location.hash = '#/notes/note-1'

    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Notes' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }))
    fireEvent.click(screen.getByRole('link', { name: /Settings/ }))

    expect(
      await screen.findByRole('heading', { name: 'Settings' })
    ).toBeTruthy()
    expect(window.location.hash).toBe('#/settings')
  })

  it('updates the route when navigation links are clicked', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }))
    expect(
      screen.getByRole('navigation', { name: 'Main navigation' })
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('link', { name: /Settings/ }))

    expect(
      await screen.findByRole('heading', { name: 'Settings' })
    ).toBeTruthy()
    expect(window.location.hash).toBe('#/settings')

    fireEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }))
    fireEvent.click(screen.getByRole('link', { name: /Notes/ }))

    expect(await screen.findByRole('heading', { name: 'Notes' })).toBeTruthy()
    expect(window.location.hash).toBe('#/notes')
  })

  it('redirects unknown routes to notes', async () => {
    window.location.hash = '#/missing-route'

    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Notes' })).toBeTruthy()
    await waitFor(() => expect(window.location.hash).toBe('#/notes'))
  })
})
