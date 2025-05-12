import { extendTheme } from '@mui/joy/styles';

const theme = extendTheme({
  defaultMode: 'dark',
  cssVarPrefix: 'joy',
  colorSchemes: {
    light: {
      palette: {
        mode: 'dark',
        primary: {
          50: '#F0F7FF',
          100: '#C2E0FF',
          200: '#99CCF3',
          300: '#66B2FF',
          400: '#3399FF',
          500: '#007FFF',
          600: '#0072E5',
          700: '#0059B2',
          800: '#004C99',
          900: '#003A75',
        },
        background: {
          body: '#000000',
          surface: '#121212',
          level1: '#000000',
          level2: '#121212',
          level3: '#1E1E1E',
          popup: '#121212',
        },
        text: {
          primary: '#ffffff',
          secondary: '#B2BAC2',
          tertiary: '#8796A5',
        },
        divider: 'rgba(255, 255, 255, 0.08)',
        border: 'rgba(255, 255, 255, 0.4)',
      },
    },
    dark: {
      palette: {
        mode: 'dark',
        primary: {
          50: '#F0F7FF',
          100: '#C2E0FF',
          200: '#99CCF3',
          300: '#66B2FF',
          400: '#3399FF',
          500: '#007FFF',
          600: '#0072E5',
          700: '#0059B2',
          800: '#004C99',
          900: '#003A75',
        },
        background: {
          body: '#000000',
          surface: '#121212',
          level1: '#000000',
          level2: '#121212',
          level3: '#1E1E1E',
          popup: '#121212',
        },
        text: {
          primary: '#ffffff',
          secondary: '#B2BAC2',
          tertiary: '#8796A5',
        },
        divider: 'rgba(255, 255, 255, 0.08)',
        border: 'rgba(255, 255, 255, 0.4)',
      },
    },
  },
  fontFamily: {
    display: "'Inter', var(--joy-fontFamily-fallback)",
    body: "'Inter', var(--joy-fontFamily-fallback)",
  },
  components: {
    JoySheet: {
      styleOverrides: {
        root: ({ theme }) => ({
          boxShadow: theme.shadow.sm,
          '--joy-shadowChannel': '0 0 0',
        }),
      },
    },
    JoyButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          boxShadow: theme.shadow.sm,
          '&:hover': {
            boxShadow: theme.shadow.md,
          },
        }),
      },
    },
  },
});

export default theme;
