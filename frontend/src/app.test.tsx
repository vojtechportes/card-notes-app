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

const openNavigation = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }))
}

describe('App routing', () => {
  afterEach(() => {
    cleanup()
    window.location.hash = ''
  })

  it('redirects the home route to notes', async () => {
    window.location.hash = ''

    render(<App />)

    expect(await screen.findByRole('heading', { name: /Notes/ })).toBeTruthy()
    await waitFor(() => expect(window.location.hash).toBe('#/notes'))
  })

  it('redirects the settings route to general settings', async () => {
    window.location.hash = '#/settings'

    render(<App />)

    expect(
      await screen.findByRole('heading', { level: 2, name: 'General' })
    ).toBeTruthy()
    expect(
      screen.getByText(
        'Set app-wide display preferences for note cards, including text truncation and how many fields appear before opening a note.'
      )
    ).toBeTruthy()
    await waitFor(() => expect(window.location.hash).toBe('#/settings/general'))
  })

  it('renders settings from a note template detail route', async () => {
    window.location.hash = '#/settings/note-templates/note-type-1'

    render(<App />)

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Note templates' })
    ).toBeTruthy()
    expect(
      screen.getByText(
        'Create and organize note templates, then open a template to manage its nested fields and field settings.'
      )
    ).toBeTruthy()
  })

  it('redirects legacy note template detail routes to note templates', async () => {
    window.location.hash = '#/settings/note-type-1'

    render(<App />)

    await waitFor(() =>
      expect(window.location.hash).toBe('#/settings/note-templates/note-type-1')
    )
  })

  it('renders notes from a note detail route and still allows navigation to settings', async () => {
    window.location.hash = '#/notes/note-1'

    render(<App />)

    expect(await screen.findByRole('heading', { name: /Notes/ })).toBeTruthy()

    openNavigation()
    fireEvent.click(screen.getByRole('link', { name: /Settings/ }))

    expect(
      await screen.findByRole('heading', { level: 2, name: 'General' })
    ).toBeTruthy()
    await waitFor(() => expect(window.location.hash).toBe('#/settings/general'))
  })

  it('navigates between all settings sub-pages with localized titles and descriptions', async () => {
    render(<App />)

    openNavigation()
    fireEvent.click(screen.getByRole('link', { name: /Settings/ }))

    expect(
      await screen.findByRole('heading', { level: 2, name: 'General' })
    ).toBeTruthy()
    expect(
      screen.getByText(
        'Set app-wide display preferences for note cards, including text truncation and how many fields appear before opening a note.'
      )
    ).toBeTruthy()
    await waitFor(() => expect(window.location.hash).toBe('#/settings/general'))

    openNavigation()
    expect(screen.getByRole('link', { name: 'Note templates' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Fields' })).toBeNull()
    expect(screen.queryByText('Note types')).toBeNull()
    fireEvent.click(screen.getByRole('link', { name: 'Note templates' }))

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Note templates' })
    ).toBeTruthy()
    expect(
      screen.getByText(
        'Create and organize note templates, then open a template to manage its nested fields and field settings.'
      )
    ).toBeTruthy()
    await waitFor(() =>
      expect(window.location.hash).toBe('#/settings/note-templates')
    )

    openNavigation()
    fireEvent.click(screen.getByRole('link', { name: 'Export / Import' }))

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Export / Import' })
    ).toBeTruthy()
    expect(
      screen.getByText(
        'Move data in and out of NoteStack with JSON backups or XLSX imports while keeping existing notes intact.'
      )
    ).toBeTruthy()
    await waitFor(() =>
      expect(window.location.hash).toBe('#/settings/export-import')
    )

    openNavigation()
    fireEvent.click(screen.getByRole('link', { name: 'Data Management' }))

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Data Management' })
    ).toBeTruthy()
    expect(
      screen.getByText(
        'Review destructive and maintenance data actions for your local notes, with guarded controls for anything permanent.'
      )
    ).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Danger Zone' })).toBeTruthy()
    await waitFor(() =>
      expect(window.location.hash).toBe('#/settings/data-management')
    )
  })

  it('updates the route when navigation links are clicked', async () => {
    render(<App />)

    openNavigation()
    expect(
      screen.getByRole('navigation', { name: 'Main navigation' })
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('link', { name: /Settings/ }))

    expect(
      await screen.findByRole('heading', { level: 2, name: 'General' })
    ).toBeTruthy()
    await waitFor(() => expect(window.location.hash).toBe('#/settings/general'))

    openNavigation()
    fireEvent.click(screen.getByRole('link', { name: 'Export / Import' }))

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Export / Import' })
    ).toBeTruthy()
    expect(window.location.hash).toBe('#/settings/export-import')

    openNavigation()
    fireEvent.click(screen.getByRole('link', { name: /Notes/ }))

    expect(await screen.findByRole('heading', { name: /Notes/ })).toBeTruthy()
    expect(window.location.hash).toBe('#/notes')
  })

  it('redirects unknown routes to notes', async () => {
    window.location.hash = '#/missing-route'

    render(<App />)

    expect(await screen.findByRole('heading', { name: /Notes/ })).toBeTruthy()
    await waitFor(() => expect(window.location.hash).toBe('#/notes'))
  })
})
