import {
  AppBar,
  Box,
  Container,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import CloseIcon from '@mui/icons-material/Close'
import MenuIcon from '@mui/icons-material/Menu'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import { useCallback, useEffect, useState, type FC } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Link as RouterLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { NotesPage } from '../../pages/notes-page/notes-page'
import { SettingsPage } from '../../pages/settings-page/settings-page'
import { SideDrawer, SideDrawerProvider } from '../side-drawer'

const drawerWidth = 248

const navItems = [
  {
    path: '/notes',
    icon: ArticleOutlinedIcon,
    labelKey: 'navigation.notes',
    summaryKey: 'navigation.notesSummary',
    isActive: (pathname: string) => pathname === '/notes' || pathname === '/',
  },
  {
    path: '/settings',
    icon: SettingsOutlinedIcon,
    labelKey: 'navigation.settings',
    summaryKey: 'navigation.settingsSummary',
    isActive: (pathname: string) => pathname.startsWith('/settings'),
  },
]

export const Layout: FC = () => {
  const location = useLocation()
  const { t } = useTranslation()
  const desktop = useMediaQuery('(min-width: 900px)')
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigationLabel = mobileOpen
    ? t('navigation.close')
    : t('navigation.open')
  const showSideDrawer = location.pathname === '/notes'

  useEffect(() => {
    document.title = t('app.title')
  }, [t])

  const handleMobileNavigationToggle = useCallback(() => {
    setMobileOpen((open) => !open)
  }, [])

  const handleMobileNavigationClose = useCallback(() => {
    setMobileOpen(false)
  }, [])

  const navigation = (
    <Box
      component="nav"
      aria-label={t('navigation.main')}
      sx={{ height: '100%', bgcolor: 'background.paper' }}
    >
      <Toolbar
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          px: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={{
              width: 22,
              height: 22,
              bgcolor: 'primary.main',
              borderRadius: 0.75,
            }}
          />
          <Typography variant="h2">{t('app.brand')}</Typography>
        </Box>
      </Toolbar>
      <List sx={{ px: 1, py: 1.5 }}>
        {navItems.map(
          ({ path, icon: Icon, labelKey, summaryKey, isActive }) => {
            const active = isActive(location.pathname)

            return (
              <ListItemButton
                key={path}
                selected={active}
                component={RouterLink}
                to={path}
                onClick={handleMobileNavigationClose}
                sx={{ borderRadius: 1, mb: 0.5 }}
              >
                <ListItemIcon sx={{ minWidth: 38 }}>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={t(labelKey)}
                  secondary={t(summaryKey)}
                  slotProps={{ primary: { sx: { fontWeight: 700 } } }}
                />
              </ListItemButton>
            )
          }
        )}
      </List>
    </Box>
  )

  return (
    <SideDrawerProvider>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <AppBar
          position="fixed"
          sx={{
            zIndex: (theme) => theme.zIndex.drawer + 1,
          }}
        >
          <Toolbar sx={{ gap: 2 }}>
            {!desktop && (
              <Tooltip title={navigationLabel}>
                <IconButton
                  edge="start"
                  color="inherit"
                  onClick={handleMobileNavigationToggle}
                  aria-label={t('navigation.toggle')}
                  sx={{ mr: 1 }}
                >
                  {mobileOpen ? (
                    <CloseIcon fontSize="small" />
                  ) : (
                    <MenuIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            )}
            <Typography variant="h2" component="div" sx={{ flexGrow: 1 }}>
              {t('app.title')}
            </Typography>
          </Toolbar>
        </AppBar>

        {desktop ? (
          <Drawer
            variant="permanent"
            sx={{
              width: drawerWidth,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: drawerWidth,
                boxSizing: 'border-box',
              },
            }}
          >
            {navigation}
          </Drawer>
        ) : (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleMobileNavigationClose}
            ModalProps={{ keepMounted: true }}
            sx={{
              '& .MuiDrawer-paper': {
                width: drawerWidth,
                boxSizing: 'border-box',
              },
            }}
          >
            {navigation}
          </Drawer>
        )}

        <Box component="main" sx={{ flexGrow: 1, minWidth: 0 }}>
          <Toolbar />
          <Container maxWidth="xl" sx={{ py: 3 }}>
            <Routes>
              <Route path="/" element={<Navigate to="/notes" replace />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Container>
        </Box>
        {showSideDrawer && <SideDrawer />}
      </Box>
    </SideDrawerProvider>
  )
}
