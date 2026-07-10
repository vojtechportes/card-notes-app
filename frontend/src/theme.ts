import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'light',

    primary: {
      main: '#0070F2',
    },

    secondary: {
      main: '#0057D2',
    },

    success: {
      main: '#188918',
    },

    warning: {
      main: '#C35500',
    },

    error: {
      main: '#D20A0A',
    },

    info: {
      main: '#0070F2',
    },

    background: {
      default: '#F5F6F7',
      paper: '#FFFFFF',
    },

    text: {
      primary: '#223548',
      secondary: '#475E75',
    },

    divider: '#D5DADD',
  },
  shape: {
    borderRadius: 6,
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Roboto, Arial, sans-serif',
    h1: {
      fontSize: '1.75rem',
      fontWeight: 700,
      letterSpacing: 0,
    },
    h2: {
      fontSize: '1.25rem',
      fontWeight: 700,
      letterSpacing: 0,
    },
    button: {
      fontWeight: 700,
      letterSpacing: 0,
      textTransform: 'none',
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 4,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          fontWeight: 700,
        },
      },
    },
  },
})
