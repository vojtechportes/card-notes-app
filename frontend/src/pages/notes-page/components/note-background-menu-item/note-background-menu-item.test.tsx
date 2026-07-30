import { MenuList, ThemeProvider } from '@mui/material'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../../../../i18n'
import { theme } from '../../../../theme'
import { NoteBackgroundMenuItem } from './note-background-menu-item'

afterEach(() => {
  cleanup()
})

describe('NoteBackgroundMenuItem', () => {
  it('opens an accessible nested picker and treats null as selected white', async () => {
    render(
      <ThemeProvider theme={theme}>
        <MenuList>
          <NoteBackgroundMenuItem background={null} onSelect={vi.fn()} />
        </MenuList>
      </ThemeProvider>
    )

    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Background options' })
    )

    expect(
      await screen.findByRole('dialog', { name: 'Background options' })
    ).toBeTruthy()
    expect(
      screen.getByRole('group', { name: 'Note background colors' })
    ).toBeTruthy()
    expect(screen.getAllByRole('button')).toHaveLength(13)
    expect(
      screen.getByRole('button', { name: 'White' }).getAttribute('aria-pressed')
    ).toBe('true')
  })

  it('highlights the current enum and reports a keyboard-accessible selection', async () => {
    const handleSelect = vi.fn()
    const handleCloseParentMenu = vi.fn()

    render(
      <ThemeProvider theme={theme}>
        <MenuList>
          <NoteBackgroundMenuItem
            background="TEAL"
            onClick={handleCloseParentMenu}
            onSelect={handleSelect}
          />
        </MenuList>
      </ThemeProvider>
    )

    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Background options' })
    )

    const teal = await screen.findByRole('button', { name: 'Teal' })
    expect(teal.getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'Cream' }))

    expect(handleSelect).toHaveBeenCalledWith('CREAM')
    expect(handleCloseParentMenu).toHaveBeenCalledTimes(1)
  })
})
