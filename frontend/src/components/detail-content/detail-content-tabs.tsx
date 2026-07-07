import { Box, type SxProps, type Theme } from '@mui/material';
import type { FC, PropsWithChildren } from 'react';

export type DetailContentTabsProps = PropsWithChildren<{
  sx?: SxProps<Theme>;
}>;

export const DetailContentTabs: FC<DetailContentTabsProps> = ({ children, sx }) => {
  return (
    <Box
      sx={{
        pr: 3,
        pl: 3,
        backgroundColor: 'background.paper',
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};





