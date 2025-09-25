'use client';

import React, { Component, ReactNode } from 'react';
import { Box, Typography, Button, Paper, Container } from '@mui/material';
import {
  ErrorOutline as ErrorIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    // Log to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Here you would log to Sentry or another error reporting service
      console.error('Production error:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Container maxWidth='md' sx={{ py: 8 }}>
          <Paper
            elevation={3}
            sx={{
              p: 4,
              textAlign: 'center',
              backgroundColor: 'error.light',
              color: 'error.contrastText',
            }}
          >
            <ErrorIcon sx={{ fontSize: 64, mb: 2, opacity: 0.8 }} />

            <Typography variant='h4' component='h1' gutterBottom>
              Something went wrong
            </Typography>

            <Typography variant='body1' sx={{ mb: 3, opacity: 0.9 }}>
              We apologize for the inconvenience. The application encountered an
              unexpected error.
            </Typography>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  backgroundColor: 'rgba(0, 0, 0, 0.1)',
                  borderRadius: 1,
                  textAlign: 'left',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  maxHeight: 200,
                  overflow: 'auto',
                }}
              >
                <Typography variant='subtitle2' gutterBottom>
                  Error Details (Development Mode):
                </Typography>
                <Typography variant='body2' component='pre'>
                  {this.state.error.message}
                </Typography>
                {this.state.error.stack && (
                  <Typography
                    variant='body2'
                    component='pre'
                    sx={{ mt: 1, opacity: 0.7 }}
                  >
                    {this.state.error.stack}
                  </Typography>
                )}
              </Box>
            )}

            <Box
              sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}
            >
              <Button
                variant='contained'
                color='inherit'
                startIcon={<RefreshIcon />}
                onClick={this.handleRetry}
                sx={{
                  backgroundColor: 'white',
                  color: 'error.main',
                  '&:hover': {
                    backgroundColor: 'grey.100',
                  },
                }}
              >
                Try Again
              </Button>

              <Button
                variant='outlined'
                color='inherit'
                onClick={this.handleReload}
                sx={{
                  borderColor: 'white',
                  color: 'white',
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                Reload Page
              </Button>
            </Box>
          </Paper>
        </Container>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo);

    // In a real app, you might want to show a toast notification
    // or redirect to an error page
  };
}
