import {
  Box,
  Divider,
  IconButton,
  LinearProgress,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import {
  createContext,
  type Dispatch,
  type FC,
  type PropsWithChildren,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import type { DetailContentContainerProps as DetailContentContainerOptions } from './detail-content';

export type SideDrawerInfo = {
  open?: boolean;
  title?: ReactNode;
  loading?: boolean;
  data?: unknown;
  drawerContent?: ReactNode;
  drawerHeaderRightContent?: ReactNode;
  drawerActions?: ReactNode;
  onClose?: () => void;
  width?: number | 'full';
  DetailContentContainerProps?: Omit<DetailContentContainerOptions, 'children'>;
};

export const drawerInitialState: SideDrawerInfo = {
  open: false,
};

type SideDrawerContextValue = {
  sideDrawerInfo: SideDrawerInfo;
  toggleDrawer: Dispatch<SetStateAction<SideDrawerInfo>>;
};

export const SideDrawerContext = createContext<SideDrawerContextValue>({
  sideDrawerInfo: drawerInitialState,
  toggleDrawer: () => undefined,
});

export const SideDrawerProvider: FC<PropsWithChildren> = ({ children }) => {
  const [sideDrawerInfo, toggleDrawer] = useState<SideDrawerInfo>(drawerInitialState);
  const value = useMemo(
    () => ({ sideDrawerInfo, toggleDrawer }),
    [sideDrawerInfo],
  );

  return (
    <SideDrawerContext.Provider value={value}>
      {children}
    </SideDrawerContext.Provider>
  );
};

export const SideDrawer: FC = () => {
  const { sideDrawerInfo, toggleDrawer } = useContext(SideDrawerContext);
  const { t } = useTranslation();
  const theme = useTheme();
  const upLg = useMediaQuery(theme.breakpoints.up('lg'));
  const [expanded, setExpanded] = useState(false);
  const drawerOnClose = sideDrawerInfo.onClose;

  const handleExpandedButtonClick = useCallback(() => {
    setExpanded((value) => !value);
  }, []);

  const handleCloseButtonClick = useCallback(() => {
    drawerOnClose?.();
    toggleDrawer(drawerInitialState);
  }, [drawerOnClose, toggleDrawer]);

  if (!sideDrawerInfo.open) {
    return null;
  }

  const resolvedWidth =
    expanded || sideDrawerInfo.width === 'full'
      ? 'calc(100vw - 248px)'
      : sideDrawerInfo.width ?? Math.max(520, window.innerWidth / 3);

  return (
    <Box
      sx={{
        position: 'fixed',
        right: 0,
        top: { xs: 56, sm: 64 },
        height: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 64px)' },
        width: { xs: '100vw', lg: resolvedWidth },
        maxWidth: { xs: '100vw', lg: 'calc(100vw - 248px)' },
        minWidth: { lg: 520 },
        bgcolor: 'background.default',
        borderLeft: 1,
        borderColor: 'divider',
        boxShadow: 8,
        zIndex: (muiTheme) => muiTheme.zIndex.drawer + 2,
        overflow: 'hidden',
      }}
      data-test-name="side-drawer"
    >
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 3,
            px: 3,
            py: 1,
          }}
        >
          <Typography variant="h2" noWrap>
            {sideDrawerInfo.title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {sideDrawerInfo.drawerHeaderRightContent}
            {sideDrawerInfo.drawerActions && (
              <>
                {sideDrawerInfo.drawerHeaderRightContent && (
                  <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                )}
                {sideDrawerInfo.drawerActions}
              </>
            )}
            {upLg && (
              <>
                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                <IconButton
                  aria-label={
                    expanded
                      ? t('detail.actions.collapseWidth')
                      : t('detail.actions.expandWidth')
                  }
                  onClick={handleExpandedButtonClick}
                >
                  {expanded ? (
                    <CloseFullscreenIcon fontSize="small" />
                  ) : (
                    <OpenInFullIcon fontSize="small" />
                  )}
                </IconButton>
              </>
            )}
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
            <IconButton
              aria-label={t('detail.actions.close')}
              onClick={handleCloseButtonClick}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Box>
      {sideDrawerInfo.loading && <LinearProgress />}
      <Box
        sx={{
          height: 'calc(100% - 57px)',
          overflowY: 'auto',
          display: sideDrawerInfo.loading ? 'none' : 'flex',
          flexDirection: 'column',
        }}
      >
        {sideDrawerInfo.drawerContent}
      </Box>
    </Box>
  );
};
