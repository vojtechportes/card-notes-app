import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { theme } from '../../../../theme'
import '../../../../i18n'
import { NotesPageHeader } from './notes-page-header'

const renderHeader = (
  viewMode: 'card' | 'data-grid',
  onViewModeChange = vi.fn()
) => {
  render(
    <ThemeProvider theme={theme}>
      <NotesPageHeader
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />
    </ThemeProvider>
  )

  return onViewModeChange
}

describe('NotesPageHeader', () => {
  afterEach(cleanup)

  it('renders an accessible exclusive view switch', () => {
    renderHeader('card')

    expect(screen.getByRole('group', { name: 'Notes view' })).toBeTruthy()
    expect(
      screen
        .getByRole('button', { name: 'Card view' })
        .getAttribute('aria-pressed')
    ).toBe('true')
    expect(
      screen
        .getByRole('button', { name: 'Data Grid view' })
        .getAttribute('aria-pressed')
    ).toBe('false')
  })

  it('notifies for a valid view change', () => {
    const onViewModeChange = renderHeader('card')

    fireEvent.click(screen.getByRole('button', { name: 'Data Grid view' }))

    expect(onViewModeChange).toHaveBeenCalledWith('data-grid')
  })

  it('ignores the null deselection event for the active view', () => {
    const onViewModeChange = renderHeader('card')

    fireEvent.click(screen.getByRole('button', { name: 'Card view' }))

    expect(onViewModeChange).not.toHaveBeenCalled()
  })
})
