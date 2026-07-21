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
import { settingsSubPageRoutes } from '../../pages/settings-page/constants/settings-sub-page-routes'
import { windowTitleBarHeight } from '../../constants/window-title-bar'
import appLogoUrl from '../../assets/logo.png'
import { SideDrawer } from '../side-drawer'

const drawerWidth = 248
const settingsPath = '/settings'
const settingsGeneralPath = `${settingsPath}/${settingsSubPageRoutes.general}`

const settingsNavItems = [
  {
    path: settingsGeneralPath,
    labelKey: 'navigation.settingsPages.general',
  },
  {
    path: `${settingsPath}/${settingsSubPageRoutes.noteTemplates}`,
    labelKey: 'navigation.settingsPages.noteTemplates',
  },
  {
    path: `${settingsPath}/${settingsSubPageRoutes.noteLabels}`,
    labelKey: 'navigation.settingsPages.noteLabels',
  },
  {
    path: `${settingsPath}/${settingsSubPageRoutes.exportImport}`,
    labelKey: 'navigation.settingsPages.exportImport',
  },
  {
    path: `${settingsPath}/${settingsSubPageRoutes.updates}`,
    labelKey: 'navigation.settingsPages.updates',
  },
  {
    path: `${settingsPath}/${settingsSubPageRoutes.dataManagement}`,
    labelKey: 'navigation.settingsPages.dataManagement',
  },
]

const navItems = [
  {
    path: '/notes',
    icon: ArticleOutlinedIcon,
    labelKey: 'navigation.notes',
    summaryKey: 'navigation.notesSummary',
    isActive: (pathname: string) =>
      pathname === '/' || pathname.startsWith('/notes'),
  },
  {
    path: settingsGeneralPath,
    icon: SettingsOutlinedIcon,
    labelKey: 'navigation.settings',
    summaryKey: 'navigation.settingsSummary',
    isActive: (pathname: string) => pathname.startsWith(settingsPath),
    children: settingsNavItems,
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
          ({ path, icon: Icon, labelKey, summaryKey, isActive, children }) => {
            const active = isActive(location.pathname)

            return (
              <Box key={path}>
                <ListItemButton
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

                {active && children ? (
                  <List component="div" disablePadding sx={{ pb: 0.5 }}>
                    {children.map((child) => {
                      const childActive =
                        location.pathname === child.path ||
                        location.pathname.startsWith(`${child.path}/`)

                      return (
                        <ListItemButton
                          key={child.path}
                          selected={childActive}
                          component={RouterLink}
                          to={child.path}
                          onClick={handleMobileNavigationClose}
                          sx={{ borderRadius: 1, mb: 0.25, py: 0.75 }}
                        >
                          <ListItemText primary={t(child.labelKey)} />
                        </ListItemButton>
                      )
                    })}
                  </List>
                ) : null}
              </Box>
            )
          }
        )}
      </List>
    </Box>
  )

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <AppBar
        position="absolute"
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
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexGrow: 1,
              minWidth: 0,
              fontSize: (theme) => theme.typography.h2.fontSize,
            }}
          >
            <Box
              component="img"
              src={appLogoUrl}
              alt={t('app.logoAlt')}
              sx={{ height: '1em', width: 'auto', flexShrink: 0 }}
            />
            <Typography variant="h2" component="div" noWrap>
              {t('app.title')}
            </Typography>
          </Box>
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
              height: '100%',
              position: 'absolute',
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
              height: `calc(100% - ${windowTitleBarHeight}px)`,
              top: `${windowTitleBarHeight}px`,
            },
          }}
        >
          {navigation}
        </Drawer>
      )}

      <Box
        component="main"
        sx={{ flexGrow: 1, height: '100%', minWidth: 0, overflow: 'auto' }}
      >
        <Toolbar />
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/notes" replace />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/notes/:noteId" element={<NotesPage />} />
            <Route path="/settings/*" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Container>
      </Box>
      <SideDrawer />
    </Box>
  )
}
