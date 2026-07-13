import { MenuItem, ThemeProvider } from '@mui/material'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../i18n'
import { theme } from '../theme'
import {
  SideDrawer,
  SideDrawerContext,
  drawerInitialState,
  type SideDrawerInfo,
} from './side-drawer'

const renderSideDrawer = (
  sideDrawerInfo: SideDrawerInfo,
  toggleDrawer = vi.fn()
) => {
  return render(
    <ThemeProvider theme={theme}>
      <SideDrawerContext.Provider value={{ sideDrawerInfo, toggleDrawer }}>
        <SideDrawer />
      </SideDrawerContext.Provider>
    </ThemeProvider>
  )
}

describe('SideDrawer', () => {
  afterEach(() => {
    cleanup()
  })

  it('delegates closing to the route owner when onClose is provided', () => {
    const handleClose = vi.fn()
    const toggleDrawer = vi.fn()

    renderSideDrawer(
      {
        open: true,
        onClose: handleClose,
        title: 'Note detail',
      },
      toggleDrawer
    )

    fireEvent.click(screen.getByRole('button', { name: 'Close detail' }))

    expect(handleClose).toHaveBeenCalledTimes(1)
    expect(toggleDrawer).not.toHaveBeenCalled()
  })

  it('falls back to local closing when no route close handler is provided', () => {
    const toggleDrawer = vi.fn()

    renderSideDrawer(
      {
        open: true,
        title: 'Standalone drawer',
      },
      toggleDrawer
    )

    fireEvent.click(screen.getByRole('button', { name: 'Close detail' }))

    expect(toggleDrawer).toHaveBeenCalledWith(drawerInitialState)
  })

  it('opens drawer actions from the overflow menu', async () => {
    const handleDelete = vi.fn()

    renderSideDrawer({
      open: true,
      title: 'Note detail',
      drawerActions: <MenuItem onClick={handleDelete}>Delete note</MenuItem>,
    })

    fireEvent.click(screen.getByRole('button', { name: 'More actions' }))
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Delete note' })
    )

    expect(handleDelete).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(screen.queryByRole('menuitem', { name: 'Delete note' })).toBeNull()
    })
  })
})
