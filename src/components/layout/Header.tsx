'use client';

import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  AccountCircle,
  Dashboard,
  Logout,
  Login,
  PersonAdd,
  Brightness4 as DarkIcon,
  Brightness7 as LightIcon,
  SettingsBrightness as AutoIcon,
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/ThemeRegistry';

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { mode, setMode } = useTheme();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [themeMenuAnchor, setThemeMenuAnchor] = useState<null | HTMLElement>(
    null
  );

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleClose();
    await logout();
  };

  const handleDashboard = () => {
    handleClose();
    router.push('/dashboard');
  };

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

  const handleGenerator = () => {
    router.push('/');
  };

  return (
    <AppBar position='static' elevation={1}>
      <Toolbar>
        <Typography
          variant='h6'
          component='div'
          sx={{ cursor: 'pointer' }}
          onClick={handleGenerator}
        >
          MUI Generator
        </Typography>

        <Box sx={{ flexGrow: 1, display: 'flex', ml: 4 }}></Box>

        {isAuthenticated ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              label={user?.name || user?.email}
              variant='outlined'
              sx={{ color: 'white', borderColor: 'white' }}
            />

            {/* Theme Toggle */}
            <Tooltip title={`Current theme: ${mode}`}>
              <IconButton
                color='inherit'
                onClick={handleThemeMenuOpen}
                aria-label='Toggle theme'
              >
                {getThemeIcon()}
              </IconButton>
            </Tooltip>

            <IconButton
              size='large'
              aria-label='account of current user'
              aria-controls='menu-appbar'
              aria-haspopup='true'
              onClick={handleMenu}
              color='inherit'
            >
              {user?.image ? (
                <Avatar src={user.image} sx={{ width: 32, height: 32 }} />
              ) : (
                <AccountCircle />
              )}
            </IconButton>
            <Menu
              id='menu-appbar'
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={handleLogout}>
                <Logout sx={{ mr: 1 }} />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Theme Toggle for non-authenticated users */}
            <Tooltip title={`Current theme: ${mode}`}>
              <IconButton
                color='inherit'
                onClick={handleThemeMenuOpen}
                aria-label='Toggle theme'
              >
                {getThemeIcon()}
              </IconButton>
            </Tooltip>

            <Button
              color='inherit'
              startIcon={<Login />}
              onClick={() => router.push('/auth/signin')}
            >
              Sign In
            </Button>
            <Button
              color='inherit'
              startIcon={<PersonAdd />}
              onClick={() => router.push('/auth/signup')}
            >
              Sign Up
            </Button>
          </Box>
        )}

        {/* Theme Menu */}
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
      </Toolbar>
    </AppBar>
  );
}
