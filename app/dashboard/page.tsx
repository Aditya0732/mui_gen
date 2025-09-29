'use client';

import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Chip,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Code as CodeIcon,
  LibraryBooks,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { useRouter } from 'next/navigation';

interface DashboardStats {
  totalComponents: number;
  recentComponents: Array<{
    id: string;
    name: string;
    type: string;
    createdAt: string;
  }>;
}

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading, requireAuth } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !requireAuth()) {
      return;
    }

    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated, isLoading, requireAuth]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/components?limit=5');

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();

      if (data.success) {
        setStats({
          totalComponents: data.data.meta.total,
          recentComponents: data.data.items,
        });
      } else {
        throw new Error(data.error?.message || 'Failed to fetch data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || loading) {
    return (
      <MainLayout>
        <Container maxWidth='lg'>
          <Box
            display='flex'
            justifyContent='center'
            alignItems='center'
            minHeight='400px'
          >
            <CircularProgress size={60} />
          </Box>
        </Container>
      </MainLayout>
    );
  }

  if (!isAuthenticated) {
    return null; // Will be redirected by requireAuth
  }

  return (
    <MainLayout>
      <Container maxWidth='lg'>
        <Box sx={{ mb: 4 }}>
          <Typography variant='h4' component='h1' gutterBottom>
            Welcome back, {user?.name || 'User'}!
          </Typography>
          <Typography variant='body1' color='text.secondary'>
            Manage your generated components and create new ones.
          </Typography>
        </Box>

        {error && (
          <Alert severity='error' sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Quick Actions */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box
                  display='flex'
                  alignItems='center'
                  justifyContent='space-between'
                >
                  <Box>
                    <Typography variant='h6' gutterBottom>
                      Generate Component
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Create a new MUI component with AI
                    </Typography>
                  </Box>
                  <Button
                    variant='contained'
                    startIcon={<AddIcon />}
                    onClick={() => router.push('/')}
                  >
                    Generate
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box
                  display='flex'
                  alignItems='center'
                  justifyContent='space-between'
                >
                  <Box>
                    <Typography variant='h6' gutterBottom>
                      Component Library
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Browse and manage your components
                    </Typography>
                  </Box>
                  <Button
                    variant='outlined'
                    startIcon={<LibraryBooks />}
                    onClick={() => router.push('/library')}
                  >
                    Browse
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Stats */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <CodeIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                <Typography variant='h4' component='div' gutterBottom>
                  {stats?.totalComponents || 0}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  Total Components
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <TimelineIcon
                  sx={{ fontSize: 48, color: 'success.main', mb: 1 }}
                />
                <Typography variant='h4' component='div' gutterBottom>
                  {stats?.recentComponents?.length || 0}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  Recent Components
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <LibraryBooks
                  sx={{ fontSize: 48, color: 'info.main', mb: 1 }}
                />
                <Typography variant='h4' component='div' gutterBottom>
                  Active
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  Account Status
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Recent Components */}
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>
              Recent Components
            </Typography>
            {stats?.recentComponents && stats.recentComponents.length > 0 ? (
              <Box sx={{ mt: 2 }}>
                {stats.recentComponents.map(component => (
                  <Box
                    key={component.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 2,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:last-child': { borderBottom: 'none' },
                    }}
                  >
                    <Box>
                      <Typography variant='subtitle1'>
                        {component.name}
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mt: 0.5,
                        }}
                      >
                        <Chip label={component.type} size='small' />
                        <Typography variant='caption' color='text.secondary'>
                          {new Date(component.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Box>
                    <Button
                      size='small'
                      onClick={() => router.push('/library')}
                    >
                      View
                    </Button>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
                No components yet. Start by generating your first component!
              </Typography>
            )}
          </CardContent>
        </Card>
      </Container>
    </MainLayout>
  );
}
