'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

interface ComponentPreviewProps {
  code?: string; // Legacy support
  previewContent?: string; // New direct HTML content
  theme?: 'light' | 'dark';
  height?: string | number;
}

interface PreviewError {
  message: string;
  stack?: string;
}

const ComponentPreview = ({
  code,
  previewContent,
  theme = 'light',
  height = 400,
}: ComponentPreviewProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const currentBlobUrl = useRef<string | null>(null);

  // Generate preview using previewContent or fallback to legacy code compilation
  const generatePreview = useCallback(async () => {
    if (!previewContent && !code) return;

    setLoading(true);
    setError(null);

    try {
      let htmlContent = previewContent;

      // If no previewContent, show a simple message for legacy code
      if (!htmlContent && code) {
        htmlContent = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Legacy Code Preview</title>
            <style>
              body { 
                margin: 0; 
                padding: 16px; 
                font-family: 'Roboto', sans-serif; 
                background-color: #fafafa;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
              }
              .message {
                text-align: center;
                color: #666;
                font-size: 16px;
              }
            </style>
          </head>
          <body>
            <div class="message">
              <h3>Component Code Available</h3>
              <p>This component was generated with legacy code format.</p>
              <p>Preview will be available with newer generations.</p>
            </div>
          </body>
          </html>
        `;
      }

      if (!htmlContent) {
        throw new Error('No content to preview');
      }

      // Clean up previous blob URL
      if (currentBlobUrl.current) {
        URL.revokeObjectURL(currentBlobUrl.current);
        currentBlobUrl.current = null;
      }

      // Create blob URL for the HTML content
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      currentBlobUrl.current = url;
      setPreviewUrl(url);
    } catch (err) {
      console.error('Preview generation failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [previewContent, code]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    generatePreview();
  }, [generatePreview]);

  // Handle iframe messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'preview-error') {
        console.error('Preview iframe error:', event.data.error);
        setError(
          `Preview Error: ${event.data.error.message || 'Unknown error'}`
        );
      } else if (event.data?.type === 'preview-ready') {
        console.log('Preview loaded successfully');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Generate preview when content changes
  useEffect(() => {
    generatePreview();
  }, [generatePreview]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (currentBlobUrl.current) {
        URL.revokeObjectURL(currentBlobUrl.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <Box
        display='flex'
        justifyContent='center'
        alignItems='center'
        height={height}
        bgcolor={theme === 'dark' ? 'grey.900' : 'grey.50'}
        borderRadius={1}
      >
        <CircularProgress size={40} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box height={height} borderRadius={1}>
        <Alert
          severity='error'
          action={
            <Tooltip title='Retry preview generation'>
              <IconButton color='inherit' size='small' onClick={handleRefresh}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          }
        >
          <strong>Preview Error:</strong> {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      position='relative'
      height={height}
      border={1}
      borderColor='divider'
      borderRadius={1}
      overflow='hidden'
      bgcolor={theme === 'dark' ? 'grey.900' : 'background.paper'}
    >
      {previewUrl && (
        <iframe
          ref={iframeRef}
          src={previewUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '4px',
          }}
          sandbox='allow-scripts allow-same-origin allow-forms allow-popups allow-modals'
          title='Component Preview'
        />
      )}

      <Tooltip title='Refresh preview'>
        <IconButton
          onClick={handleRefresh}
          size='small'
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            bgcolor: 'background.paper',
            boxShadow: 1,
            '&:hover': {
              bgcolor: 'background.paper',
              boxShadow: 2,
            },
          }}
        >
          <RefreshIcon fontSize='small' />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default ComponentPreview;
