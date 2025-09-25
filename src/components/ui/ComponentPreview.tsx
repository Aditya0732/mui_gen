'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  CircularProgress, 
  Alert, 
  Typography,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';

interface ComponentPreviewProps {
  code: string;
  theme?: 'light' | 'dark';
  props?: Record<string, any>;
  height?: string | number;
  width?: string | number;
}

export function ComponentPreview({
  code,
  theme = 'light',
  props = {},
  height = '400px',
  width = '100%',
}: ComponentPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const generatePreview = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          theme,
          props,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Preview generation failed');
      }

      const data = await response.json();
      
      if (data.success) {
        setPreviewUrl(data.data.previewUrl);
      } else {
        throw new Error(data.error?.message || 'Preview generation failed');
      }
    } catch (err) {
      console.error('Preview error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (code.trim()) {
      generatePreview();
    }
  }, [code, theme, props]);

  const handleRefresh = () => {
    generatePreview();
  };

  const handleOpenInNew = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  const handleIframeLoad = () => {
    setLoading(false);
  };

  const handleIframeError = () => {
    setLoading(false);
    setError('Failed to load component preview');
  };

  if (error) {
    return (
      <Box sx={{ p: 2, height, display: 'flex', alignItems: 'center' }}>
        <Alert 
          severity="error" 
          sx={{ width: '100%' }}
          action={
            <IconButton
              color="inherit"
              size="small"
              onClick={handleRefresh}
            >
              <RefreshIcon />
            </IconButton>
          }
        >
          <Typography variant="body2">
            Preview Error: {error}
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height, width, position: 'relative' }}>
      {/* Preview Controls */}
      <Box 
        sx={{ 
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 1,
          display: 'flex',
          gap: 1,
        }}
      >
        <Tooltip title="Refresh Preview">
          <IconButton
            size="small"
            onClick={handleRefresh}
            sx={{ 
              backgroundColor: 'background.paper',
              boxShadow: 1,
              '&:hover': {
                backgroundColor: 'background.paper',
              }
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
        
        {previewUrl && (
          <Tooltip title="Open in New Tab">
            <IconButton
              size="small"
              onClick={handleOpenInNew}
              sx={{ 
                backgroundColor: 'background.paper',
                boxShadow: 1,
                '&:hover': {
                  backgroundColor: 'background.paper',
                }
              }}
            >
              <OpenInNewIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Loading State */}
      {loading && (
        <Box 
          sx={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'background.paper',
            zIndex: 2,
          }}
        >
          <Box textAlign="center">
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Generating preview...
            </Typography>
          </Box>
        </Box>
      )}

      {/* Preview iframe */}
      {previewUrl ? (
        <iframe
          ref={iframeRef}
          src={previewUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '4px',
          }}
          sandbox="allow-scripts allow-same-origin"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title="Component Preview"
        />
      ) : !loading && (
        <Paper 
          sx={{ 
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'grey.50',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No preview available
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
