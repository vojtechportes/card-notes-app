import { CssBaseline, ThemeProvider } from '@mui/material';
import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import type { PropsWithChildren } from 'react';
import { HashRouter } from 'react-router-dom';
import { theme } from '../../theme';
import { createQueryClient } from '../../utils/create-query-client.util';
import { ConfirmationProvider } from '../confirmation';

export const AppProviders = ({ children }: PropsWithChildren) => {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ConfirmationProvider>
          <HashRouter>{children}</HashRouter>
        </ConfirmationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

