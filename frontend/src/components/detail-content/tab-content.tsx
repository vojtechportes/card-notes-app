import { Box, type SxProps, type Theme } from '@mui/material';
import type { FC, PropsWithChildren } from 'react';

export type TabContentProps = PropsWithChildren<{
  value?: string;
  show?: boolean;
  sx?: SxProps<Theme>;
}>;

export const TabContent: FC<TabContentProps> = ({ value, show = true, sx, children }) => {
  if (!show) {
    return null;
  }

  return (
    <Box data-test-name="tab-content" data-test-value={value} sx={sx}>
      {children}
    </Box>
  );
};





