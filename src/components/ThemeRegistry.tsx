'use client';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import {
  ReactNode,
  createContext,
  useContext,
  useState,
  useEffect,
} from 'react';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  actualMode: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeRegistry');
  }
  return context;
}

interface ThemeRegistryProps {
  children: ReactNode;
}

export function ThemeRegistry({ children }: ThemeRegistryProps) {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [actualMode, setActualMode] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Load theme preference from localStorage
    const savedMode = localStorage.getItem('theme-mode') as ThemeMode;
    if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
      setMode(savedMode);
    }
  }, []);

  useEffect(() => {
    // Save theme preference to localStorage
    localStorage.setItem('theme-mode', mode);

    // Determine actual mode
    if (mode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setActualMode(mediaQuery.matches ? 'dark' : 'light');

      const handleChange = (e: MediaQueryListEvent) => {
        setActualMode(e.matches ? 'dark' : 'light');
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      setActualMode(mode);
      return undefined;
    }
  }, [mode]);

  const theme = createTheme({
    palette: {
      mode: actualMode,
      primary: {
        main: '#1976d2',
        light: '#42a5f5',
        dark: '#1565c0',
      },
      secondary: {
        main: '#dc004e',
        light: '#ff5983',
        dark: '#9a0036',
      },
      background: {
        default: actualMode === 'dark' ? '#0a0e13' : '#fafafa',
        paper: actualMode === 'dark' ? '#1e1e1e' : '#ffffff',
      },
    },
    typography: {
      fontFamily:
        'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      h1: {
        fontSize: '2.5rem',
        fontWeight: 600,
        lineHeight: 1.2,
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 600,
        lineHeight: 1.3,
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: 600,
        lineHeight: 1.4,
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.6,
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.5,
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            borderRadius: 8,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow:
              actualMode === 'dark'
                ? '0 4px 20px rgba(0, 0, 0, 0.3)'
                : '0 4px 20px rgba(0, 0, 0, 0.1)',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
    },
  });

  const contextValue: ThemeContextType = {
    mode,
    setMode,
    actualMode,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}
