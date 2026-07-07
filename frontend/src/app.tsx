import { CssBaseline, ThemeProvider } from '@mui/material';
import { HashRouter } from 'react-router-dom';
import { Layout } from './components/layout/layout';
import { theme } from './theme';

export const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HashRouter>
        <Layout />
      </HashRouter>
    </ThemeProvider>
  );
};
