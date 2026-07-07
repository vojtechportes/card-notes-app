import { Box, type SxProps, type Theme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useContext, type FC, type PropsWithChildren } from 'react';
import { SideDrawerContext } from '../../side-drawer';
import { DetailContentContainerProvider } from './detail-content-container-provider';

export type DetailContentContainerProps = PropsWithChildren<{
  sx?: SxProps<Theme>;
  fullHeight?: boolean;
  variant?: 'transparent' | 'default';
}>;

export const DetailContentContainer: FC<DetailContentContainerProps> = ({
  children,
  sx,
  fullHeight,
  variant = 'default',
}) => {
  const sideDrawerContextProps = useContext(SideDrawerContext);
  const detailContentContainerProps =
    sideDrawerContextProps.sideDrawerInfo.DetailContentContainerProps;

  const resolvedFullHeight =
    detailContentContainerProps?.fullHeight || fullHeight;
  const resolvedVariant = detailContentContainerProps?.variant || variant;
  const resolvedSx = detailContentContainerProps?.sx || sx;

  return (
    <DetailContentContainerProvider fullHeight={resolvedFullHeight}>
      <Box
        sx={{
          backgroundColor:
            resolvedVariant === 'transparent'
              ? undefined
              : (theme) => alpha(theme.palette.primary.main, 0.08),
          borderBottom:
            resolvedVariant === 'transparent'
              ? undefined
              : (theme) => `1px solid ${theme.palette.divider}`,
          ...(resolvedFullHeight && { flex: 1 }),
          ...resolvedSx,
        }}
      >
        {children}
      </Box>
    </DetailContentContainerProvider>
  );
};

