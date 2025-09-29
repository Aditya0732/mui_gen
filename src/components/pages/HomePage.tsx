'use client';

import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Paper,
  Fade,
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  Code as CodeIcon,
  Accessibility as AccessibilityIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Palette as PaletteIcon,
} from '@mui/icons-material';

import { ComponentGenerator } from '@/components/features/ComponentGenerator';
import { ComponentLibrary } from '@/components/features/ComponentLibrary';
import { FeatureCard } from '@/components/ui/FeatureCard';

export function HomePage() {
  const [activeTab, setActiveTab] = useState<'generate' | 'library'>(
    'generate'
  );

  const features = [
    {
      icon: <AIIcon sx={{ fontSize: 40 }} />,
      title: 'AI-Powered Generation',
      description:
        'Generate React components from plain English descriptions using advanced AI.',
      color: 'primary' as const,
    },
    {
      icon: <CodeIcon sx={{ fontSize: 40 }} />,
      title: 'TypeScript Ready',
      description:
        'All generated components are fully typed with TypeScript and compile without errors.',
      color: 'secondary' as const,
    },
    {
      icon: <AccessibilityIcon sx={{ fontSize: 40 }} />,
      title: 'Accessibility First',
      description:
        'WCAG 2.1 AA compliant components with proper ARIA labels and keyboard navigation.',
      color: 'success' as const,
    },
    {
      icon: <SpeedIcon sx={{ fontSize: 40 }} />,
      title: 'Lightning Fast',
      description:
        'Generate and preview components in under 2 seconds with optimized bundling.',
      color: 'info' as const,
    },
    {
      icon: <SecurityIcon sx={{ fontSize: 40 }} />,
      title: 'Secure by Design',
      description:
        'Generated code is automatically scanned for security vulnerabilities and unsafe patterns.',
      color: 'warning' as const,
    },
    {
      icon: <PaletteIcon sx={{ fontSize: 40 }} />,
      title: 'Material-UI',
      description:
        'Built with Material-UI components for consistent, beautiful design systems.',
      color: 'error' as const,
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Hero Section */}
      <Container maxWidth='lg' sx={{ pt: 8, pb: 4 }}>
        <Fade in timeout={1000}>
          <Box textAlign='center' mb={8}>
            <Typography
              variant='h1'
              component='h1'
              gutterBottom
              sx={{
                background: 'linear-gradient(45deg, #1976d2 30%, #dc004e 90%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 3,
              }}
            >
              MUI Component Generator
            </Typography>

            <Typography
              variant='h5'
              component='h2'
              color='text.secondary'
              sx={{ mb: 4, maxWidth: 800, mx: 'auto' }}
            >
              Transform your ideas into production-ready React components with
              AI. Generate, customize, and export Material-UI components in
              seconds.
            </Typography>

            <Box
              sx={{
                display: 'flex',
                gap: 1,
                justifyContent: 'center',
                flexWrap: 'wrap',
                mb: 4,
              }}
            >
              <Chip label='TypeScript' color='primary' variant='outlined' />
              <Chip label='Material-UI' color='primary' variant='outlined' />
              <Chip label='Accessibility' color='success' variant='outlined' />
              <Chip label='AI-Powered' color='secondary' variant='outlined' />
            </Box>

            <Box
              sx={{
                display: 'flex',
                gap: 2,
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <Button
                variant='contained'
                size='large'
                onClick={() => setActiveTab('generate')}
                sx={{ minWidth: 160 }}
              >
                Start Generating
              </Button>
              <Button
                variant='outlined'
                size='large'
                onClick={() => setActiveTab('library')}
                sx={{ minWidth: 160 }}
              >
                Browse Library
              </Button>
            </Box>
          </Box>
        </Fade>

        {/* Main Content */}
        <Paper
          elevation={2}
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            mb: 8,
          }}
        >
          {activeTab === 'generate' ? (
            <ComponentGenerator />
          ) : (
            <ComponentLibrary />
          )}
        </Paper>

        {/* Features Section */}
        <Box sx={{ mt: 12, mb: 8 }}>
          <Typography
            variant='h3'
            component='h2'
            textAlign='center'
            gutterBottom
            sx={{ mb: 6 }}
          >
            Why Choose Our Generator?
          </Typography>

          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <Fade in timeout={1000 + index * 200}>
                  <Box>
                    <FeatureCard {...feature} />
                  </Box>
                </Fade>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
    </Box>
  );
}
