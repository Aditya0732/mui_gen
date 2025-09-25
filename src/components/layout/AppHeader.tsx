'use client';

import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  Brightness4 as DarkIcon,
  Brightness7 as LightIcon,
  SettingsBrightness as AutoIcon,
  GitHub as GitHubIcon,
  MenuBook as DocsIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { useTheme } from '@/components/ThemeRegistry';

export function AppHeader() {
  const { mode, setMode, actualMode } = useTheme();
  const [themeMenuAnchor, setThemeMenuAnchor] = useState<null | HTMLElement>(null);

  const handleThemeMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setThemeMenuAnchor(event.currentTarget);
  };

  const handleThemeMenuClose = () => {
    setThemeMenuAnchor(null);
  };

  const handleThemeChange = (newMode: 'light' | 'dark' | 'system') => {
    setMode(newMode);
    handleThemeMenuClose();
  };

  const getThemeIcon = () => {
    switch (mode) {
      case 'light':
        return <LightIcon />;
      case 'dark':
        return <DarkIcon />;
      case 'system':
        return <AutoIcon />;
      default:
        return <AutoIcon />;
    }
  };

  return (
    <AppBar 
      position="sticky" 
      elevation={1}
      sx={{ 
        backgroundColor: 'background.paper',
        color: 'text.primary',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Toolbar>
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            flexGrow: 1,
            fontWeight: 600,
            background: 'linear-gradient(45deg, #1976d2 30%, #dc004e 90%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          MUI Component Generator
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            color="inherit"
            startIcon={<DocsIcon />}
            href="/docs"
            sx={{ display: { xs: 'none', sm: 'flex' } }}
          >
            Documentation
          </Button>

          <Tooltip title="View on GitHub">
            <IconButton
              color="inherit"
              href="https://github.com/your-repo/mui-gen"
              target="_blank"
              rel="noopener noreferrer"
            >
              <GitHubIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title={`Current theme: ${mode}`}>
            <IconButton
              color="inherit"
              onClick={handleThemeMenuOpen}
              aria-label="Toggle theme"
            >
              {getThemeIcon()}
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={themeMenuAnchor}
            open={Boolean(themeMenuAnchor)}
            onClose={handleThemeMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem 
              onClick={() => handleThemeChange('light')}
              selected={mode === 'light'}
            >
              <LightIcon sx={{ mr: 1 }} />
              Light
            </MenuItem>
            <MenuItem 
              onClick={() => handleThemeChange('dark')}
              selected={mode === 'dark'}
            >
              <DarkIcon sx={{ mr: 1 }} />
              Dark
            </MenuItem>
            <MenuItem 
              onClick={() => handleThemeChange('system')}
              selected={mode === 'system'}
            >
              <AutoIcon sx={{ mr: 1 }} />
              System
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
