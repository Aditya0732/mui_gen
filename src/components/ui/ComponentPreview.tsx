'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Alert,
  CircularProgress,
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
  height?: number | string;
}

const ComponentPreview = ({
  code,
  theme = 'light',
  props = {},
  height = 400,
}: ComponentPreviewProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const currentBlobUrl = useRef<string | null>(null);

  // 🧹 Utility to sanitize generated component code so it runs in browser preview
  const sanitizeGeneratedCode = (componentCode: string) => {
    let cleaned = componentCode;

    // 1. Remove all import/export statements (they break in <script>)
    cleaned = cleaned.replace(/import[^;]+;/g, '');
    cleaned = cleaned.replace(/export\s+default\s+/g, '');
    cleaned = cleaned.replace(/export\s+\{[^}]+\};?/g, '');

    // 2. Remove all TypeScript interfaces and types
    cleaned = cleaned.replace(/interface\s+\w+\s+\{[^}]+\}/gs, '');
    cleaned = cleaned.replace(/type\s+\w+\s+=\s+[^;]+;/g, '');
    cleaned = cleaned.replace(/:\s*[\w<>\[\]\|]+/g, ''); // remove type annotations like ": string"

    // 3. Replace params.row / params.id with safe variables
    cleaned = cleaned.replace(/\bparams\.row\b/g, 'row');
    cleaned = cleaned.replace(/\bparams\.id\b/g, 'id');

    // 4. Replace icon component names (e.g., VisibilityIcon -> Visibility)
    cleaned = cleaned.replace(/\bVisibilityIcon\b/g, 'Visibility');
    cleaned = cleaned.replace(/\bEditIcon\b/g, 'Edit');
    cleaned = cleaned.replace(/\bDeleteIcon\b/g, 'Delete');
    cleaned = cleaned.replace(/\bAddIcon\b/g, 'Add');
    cleaned = cleaned.replace(/\bSaveIcon\b/g, 'Save');
    cleaned = cleaned.replace(/\bCancelIcon\b/g, 'Cancel');
    cleaned = cleaned.replace(/\bSearchIcon\b/g, 'Search');
    cleaned = cleaned.replace(/\bHomeIcon\b/g, 'Home');
    cleaned = cleaned.replace(/\bSettingsIcon\b/g, 'Settings');
    cleaned = cleaned.replace(/\bPersonIcon\b/g, 'Person');
    cleaned = cleaned.replace(/\bEmailIcon\b/g, 'Email');
    cleaned = cleaned.replace(/\bPhoneIcon\b/g, 'Phone');
    cleaned = cleaned.replace(/\bCheckIcon\b/g, 'Check');
    cleaned = cleaned.replace(/\bCloseIcon\b/g, 'Close');
    cleaned = cleaned.replace(/\bArrowBackIcon\b/g, 'ArrowBack');
    cleaned = cleaned.replace(/\bArrowForwardIcon\b/g, 'ArrowForward');
    cleaned = cleaned.replace(/\bMenuIcon\b/g, 'MenuIcon');
    cleaned = cleaned.replace(/\bMoreVertIcon\b/g, 'MoreVert');

    // 5. Add safe defaults for id and row
    cleaned = `
      // ✅ Inject safe defaults so runtime errors won't happen
      var params = params || {};
      var row = params.row || {};
      var id = params.id || row.id || null;
      var user = row || {};
      var item = row || {};
      var data = row || {};

      ${cleaned}
    `;

    return cleaned;
  };

  const createPreviewHTML = (
    componentCode: string,
    isDark: boolean = false
  ) => {
    // Extract component name from code - handle multiple patterns
    let componentName = 'GeneratedComponent';

    // Try different patterns to find the component name
    const patterns = [
      /export\s+default\s+function\s+(\w+)/, // export default function ComponentName
      /export\s+default\s+(\w+)/, // export default ComponentName
      /const\s+(\w+):\s*React\.FC/, // const ComponentName: React.FC
      /const\s+(\w+)\s*=.*=>/, // const ComponentName = () =>
      /function\s+(\w+)/, // function ComponentName
    ];

    for (const pattern of patterns) {
      const match = componentCode.match(pattern);
      if (match && match[1]) {
        componentName = match[1];
        break;
      }
    }

    console.log('Extracted component name:', componentName);

    // For debugging - if this is a complex DataGrid component, let's try a simple test first
    if (
      componentCode.includes('DataGrid') &&
      componentCode.includes('getActions')
    ) {
      console.log(
        '🔍 Detected complex DataGrid component - this might have scoping issues'
      );
      console.log('Original code length:', componentCode.length);
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Component Preview</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@mui/material@5.15.0/umd/material-ui.development.js"></script>
  <script src="https://unpkg.com/@mui/x-data-grid@6.22.1/umd/material-ui-x-data-grid.development.js"></script>
  <script src="https://unpkg.com/@mui/icons-material@5.15.0/umd/material-ui-icons.development.js"></script>
  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: "Roboto", "Helvetica", "Arial", sans-serif;
      background-color: ${isDark ? '#121212' : '#fafafa'};
      color: ${isDark ? '#ffffff' : '#000000'};
      min-height: 100vh;
    }
    #root {
      width: 100%;
      height: 100%;
    }
    .error-boundary {
      padding: 16px;
      background-color: #ffebee;
      color: #c62828;
      border-radius: 4px;
      border: 1px solid #e57373;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/javascript">
    try {
      // ✅ Access UMD globals from script tags
      const { useState, useEffect, createElement } = React;
      const { 
        Button, Typography, Card, CardContent, CardActions, 
        TextField, Box, Paper, Container, Grid, Stack,
        Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
        List, ListItem, ListItemText, ListItemButton,
        AppBar, Toolbar, IconButton, Menu, MenuItem,
        Dialog, DialogTitle, DialogContent, DialogActions,
        Chip, Avatar, Divider, Alert, CircularProgress,
        FormControl, FormLabel, FormControlLabel, FormGroup,
        Radio, RadioGroup, Checkbox, Switch, Select, InputLabel,
        Accordion, AccordionSummary, AccordionDetails,
        Tabs, Tab, TabPanel, Breadcrumbs, Link,
        Drawer, Stepper, Step, StepLabel,
        createTheme, ThemeProvider
      } = MaterialUI;

      // ✅ Icons from MaterialUIIcons global (avoid naming conflicts with MUI components)
      const { 
        Visibility, Edit, Delete, Add, Save, Cancel, Search, 
        Home, Settings, Person, Email, Phone, Check, Close,
        ArrowBack, ArrowForward, MoreVert,
        Menu: MenuIcon
      } = MaterialUIIcons || {};

      // ✅ MUI X Data Grid from MaterialUIGrid global
      let DataGrid = null;
      let GridActionsCellItem = null;
      try {
        if (window.MaterialUIGrid && window.MaterialUIGrid.DataGrid) {
          DataGrid = window.MaterialUIGrid.DataGrid;
          GridActionsCellItem = window.MaterialUIGrid.GridActionsCellItem;
          console.log('DataGrid loaded successfully from CDN');
        }
      } catch (e) {
        console.warn('DataGrid CDN not available:', e);
      }
      
      // Always provide a fallback DataGrid that renders as a simple table
      if (!DataGrid) {
        console.log('Using fallback DataGrid component');
        DataGrid = ({ rows = [], columns = [], ...props }) => {
          return React.createElement(Table, null, [
            React.createElement(TableHead, { key: 'head' }, 
              React.createElement(TableRow, null, 
                columns.map((col, i) => 
                  React.createElement(TableCell, { key: i }, col.headerName || col.field)
                )
              )
            ),
            React.createElement(TableBody, { key: 'body' }, 
              rows.slice(0, 5).map((row, i) => 
                React.createElement(TableRow, { key: i }, 
                  columns.map((col, j) => 
                    React.createElement(TableCell, { key: j }, row[col.field] || '-')
                  )
                )
              )
            )
          ]);
        };
      }
      
      // ✅ Provide GridActionsCellItem fallback if not loaded from CDN
      if (!GridActionsCellItem) {
        GridActionsCellItem = ({ label, onClick, ...props }) => {
          return React.createElement(Button, { 
            size: 'small', 
            onClick: onClick,
            variant: 'text'
          }, label);
        };
      }

      // Create theme
      const theme = createTheme({
        palette: {
          mode: '${isDark ? 'dark' : 'light'}',
        },
      });

      // 🧹 Use the sanitized code generation approach
      var executableCode = \`${sanitizeGeneratedCode(componentCode).replace(/`/g, '\\`')}\`;
      
      // Wrap getActions in defensive try-catch for additional safety
      executableCode = executableCode.replace(
        /getActions:\\s*\\(.*?\\)\\s*=>\\s*\\[(.*?)\\]/gs,
        'getActions: (params) => { try { const row = params?.row || {}; const id = params?.id; return [$1]; } catch(e) { console.error("getActions error:", e); return []; } }'
      );
      
      console.log('Transformed code (full):', executableCode);
      console.log('Transformed code preview:', executableCode.substring(0, 500) + '...');
      
      // Execute the component code in global scope with proper error handling
      try {
        // Create a safer execution context with additional safety nets
        var globalScope = window;
        
        // Double safety: ensure these variables exist globally before eval
        globalScope.params = globalScope.params || {};
        globalScope.row = globalScope.row || {};
        globalScope.id = globalScope.id || null;
        globalScope.user = globalScope.user || {};
        globalScope.item = globalScope.item || {};
        globalScope.data = globalScope.data || {};
        
        eval.call(globalScope, executableCode);
      } catch (evalError) {
        console.error('Code execution error:', evalError);
        console.error('Error details:', {
          message: evalError.message,
          stack: evalError.stack,
          name: evalError.name
        });
        throw new Error('Failed to execute component code: ' + evalError.message + ' (Check console for full details)');
      }
      
      // Try different ways to get the component
      let ComponentToRender = null;
      
      // Try global scope first
      if (window.${componentName}) {
        ComponentToRender = window.${componentName};
      } else if (typeof ${componentName} !== 'undefined') {
        ComponentToRender = ${componentName};
      }
      
      console.log('Component found:', !!ComponentToRender, 'Name:', '${componentName}');
      
      if (!ComponentToRender) {
        throw new Error('Component not found: ${componentName}');
      }

      // Render the component with theme
      const App = () => {
        return React.createElement(ThemeProvider, { theme }, 
          React.createElement(ComponentToRender)
        );
      };

      ReactDOM.render(React.createElement(App), document.getElementById('root'));
      
      console.log('Component rendered successfully!');
      
    } catch (error) {
      console.error('Component rendering error:', error);
      
      // Show error in the UI
      var errorCode = typeof executableCode !== 'undefined' ? executableCode.substring(0, 500) : 'Code not available';
      document.getElementById('root').innerHTML = \`
        <div class="error-boundary">
          <h3>Component Rendering Error</h3>
          <p><strong>Error:</strong> \${error.message}</p>
          <p><strong>Component Name:</strong> ${componentName}</p>
          <details>
            <summary>Transformed Code (First 500 chars)</summary>
            <pre>\${errorCode}</pre>
          </details>
          <details>
            <summary>Stack Trace</summary>
            <pre>\${error.stack}</pre>
          </details>
        </div>
      \`;
      
      // Also log to parent window if possible
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'preview-error',
          error: error.message,
          componentName: '${componentName}'
        }, '*');
      }
    }
  </script>
</body>
</html>
    `.trim();
  };

  const generatePreview = useCallback(async () => {
    if (!code.trim()) {
      setError('No code to preview');
      return;
    }

    setLoading(true);
    setError(null);

    // Clean up previous blob URL
    if (currentBlobUrl.current) {
      URL.revokeObjectURL(currentBlobUrl.current);
      currentBlobUrl.current = null;
    }

    try {
      console.log('Generating preview with Blob URL approach...', code);

      // Create HTML for the component
      const html = createPreviewHTML(code, theme === 'dark');

      // Create blob URL
      const blob = new Blob([html], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);

      console.log('Created blob URL:', blobUrl);
      currentBlobUrl.current = blobUrl;
      setPreviewUrl(blobUrl);
    } catch (err) {
      console.error('Preview generation error:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to generate preview'
      );
      setLoading(false);
    }
  }, [code, theme]); // Add dependencies to useCallback

  useEffect(() => {
    if (code.trim()) {
      generatePreview();
    }
  }, [code, theme]); // Remove props from dependency array to avoid infinite loops

  useEffect(() => {
    // Listen for messages from iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'preview-error') {
        console.error('Preview iframe error:', event.data);
        setError(`Component error: ${event.data.error}`);
        setLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []); // Empty dependency array for message listener

  useEffect(() => {
    // Cleanup blob URLs on unmount
    return () => {
      if (currentBlobUrl.current) {
        URL.revokeObjectURL(currentBlobUrl.current);
      }
    };
  }, []); // Empty dependency array for cleanup

  const handleRefresh = useCallback(() => {
    generatePreview();
  }, [generatePreview]);

  const handleOpenInNew = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  const handleIframeLoad = () => {
    console.log('Iframe loaded successfully:', previewUrl);
    setLoading(false);
  };

  const handleIframeError = (event: any) => {
    console.error('Iframe loading error:', event);
    console.error('Failed to load URL:', previewUrl);
    setLoading(false);
    setError('Failed to load component preview');
  };

  if (error) {
    return (
      <Box sx={{ p: 2, height, display: 'flex', alignItems: 'center' }}>
        <Alert severity='error' sx={{ width: '100%' }}>
          <Typography variant='h6' gutterBottom>
            Preview Error
          </Typography>
          <Typography variant='body2'>{error}</Typography>
          <Box sx={{ mt: 2 }}>
            <IconButton onClick={handleRefresh} size='small'>
              <RefreshIcon />
            </IconButton>
          </Box>
        </Alert>
      </Box>
    );
  }

  return (
    <Paper
      sx={{
        position: 'relative',
        height,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          backgroundColor: 'background.default',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant='body2' color='text.secondary'>
          Component Preview
        </Typography>
        <Box>
          <Tooltip title='Refresh Preview'>
            <IconButton onClick={handleRefresh} size='small'>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title='Open in New Tab'>
            <IconButton onClick={handleOpenInNew} size='small'>
              <OpenInNewIcon />
            </IconButton>
          </Tooltip>
        </Box>
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
          <Box textAlign='center'>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant='body2' color='text.secondary'>
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
            height: 'calc(100% - 49px)', // Account for header
            border: 'none',
          }}
          sandbox='allow-scripts allow-same-origin allow-forms allow-popups allow-modals'
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title='Component Preview'
        />
      ) : (
        !loading && (
          <Paper
            sx={{
              height: 'calc(100% - 49px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'grey.50',
            }}
          >
            <Typography variant='body2' color='text.secondary'>
              No preview available
            </Typography>
          </Paper>
        )
      )}
    </Paper>
  );
};

export default ComponentPreview;
