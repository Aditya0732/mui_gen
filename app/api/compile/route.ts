import { NextRequest, NextResponse } from 'next/server';
import { API } from '@/types/api';

// Security patterns to block
const DANGEROUS_PATTERNS = [
  /dangerouslySetInnerHTML/i,
  /window\./,
  /document\./,
  /eval\s*\(/,
  /new\s+Function/,
  /\.cookie/,
  /fetch\s*\(/,
  /XMLHttpRequest/,
  /localStorage/,
  /sessionStorage/,
  /indexedDB/,
  /webkitIndexedDB/,
  /mozIndexedDB/,
  /msIndexedDB/,
  /import\s+.*from\s+['"]http/,
  /require\s*\(\s*['"]http/,
  /__dirname/,
  /__filename/,
  /process\./,
  /global\./,
  /Buffer/,
  /require\s*\(/,
];

// Allowed imports/modules
const ALLOWED_IMPORTS = [
  'react',
  '@mui/material',
  '@mui/icons-material',
  '@mui/x-data-grid',
  '@emotion/react',
  '@emotion/styled',
];

function performSafetyChecks(code: string): {
  safe: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(code)) {
      violations.push(`Dangerous pattern detected: ${pattern.source}`);
    }
  }

  // Check imports
  const importMatches =
    code.match(/import\s+.*?from\s+['"]([^'"]+)['"]/g) || [];
  for (const importMatch of importMatches) {
    const moduleMatch = importMatch.match(/from\s+['"]([^'"]+)['"]/);
    if (moduleMatch) {
      const moduleName = moduleMatch[1];
      const isAllowed = ALLOWED_IMPORTS.some(
        allowed =>
          moduleName === allowed || moduleName.startsWith(allowed + '/')
      );
      if (
        !isAllowed &&
        !moduleName.startsWith('./') &&
        !moduleName.startsWith('../')
      ) {
        violations.push(`Disallowed import: ${moduleName}`);
      }
    }
  }

  return {
    safe: violations.length === 0,
    violations,
  };
}

function sanitizeCode(code: string, componentName: string): string {
  let sanitized = code;

  // Remove all import statements
  sanitized = sanitized.replace(/^import\s+.*?;$/gm, '');

  // Remove export statements but keep the component
  sanitized = sanitized.replace(/^export\s+default\s+/gm, '');
  sanitized = sanitized.replace(/^export\s+/gm, '');

  // Remove TypeScript type annotations and interfaces
  sanitized = sanitized.replace(/:\s*React\.FC<[^>]*>/g, '');
  sanitized = sanitized.replace(/:\s*FC<[^>]*>/g, '');
  sanitized = sanitized.replace(/interface\s+\w+\s*\{[^}]*\}/gs, '');
  sanitized = sanitized.replace(/type\s+\w+\s*=[^;]+;/g, '');

  // Remove TypeScript type assertions (as Type)
  sanitized = sanitized.replace(/\s+as\s+\w+(\[\])?/g, '');
  sanitized = sanitized.replace(/\s+as\s+\w+<[^>]*>/g, '');

  // Remove function parameter types
  sanitized = sanitized.replace(/(\w+):\s*\w+(\[\])?(\s*[,)])/g, '$1$3');
  sanitized = sanitized.replace(/(\w+):\s*\w+<[^>]*>(\s*[,)])/g, '$1$2');

  // Remove return type annotations
  sanitized = sanitized.replace(/\):\s*\w+(\[\])?\s*=>/g, ') =>');
  sanitized = sanitized.replace(/\):\s*\w+<[^>]*>\s*=>/g, ') =>');

  // Remove generic type parameters and array type annotations
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Remove variable type annotations (e.g., const rows: Type[] = ...)
  sanitized = sanitized.replace(
    /const\s+(\w+):\s*\w+(\[\])?\s*=/g,
    'const $1 ='
  );
  sanitized = sanitized.replace(/let\s+(\w+):\s*\w+(\[\])?\s*=/g, 'let $1 =');
  sanitized = sanitized.replace(/var\s+(\w+):\s*\w+(\[\])?\s*=/g, 'var $1 =');

  // Fix incomplete JSX elements - ensure proper opening tags
  sanitized = sanitized.replace(
    /\s*}\s*label=/g,
    '\n              <GridActionsCellItem\n                label='
  );

  // Fix missing width values in column definitions
  sanitized = sanitized.replace(/width,/g, 'width: 150,');
  sanitized = sanitized.replace(/width$/gm, 'width: 150');

  // Fix empty return statements
  sanitized = sanitized.replace(
    /return\s*\(\s*\);/g,
    'return React.createElement("div", null, "Component");'
  );
  sanitized = sanitized.replace(
    /return\s*\(\s*$/gm,
    'return React.createElement("div", null, "Component"'
  );

  // Fix incomplete JSX/React.createElement calls
  sanitized = sanitized.replace(
    /React\.createElement\(\s*$/gm,
    'React.createElement("div", null, "Loading...")'
  );

  // Add missing semicolons after component declarations
  sanitized = sanitized.replace(/(\w+);?\s*$/gm, '$1;');

  // Additional fixes for specific issues
  // Remove array type annotations from variable declarations
  sanitized = sanitized.replace(/const\s+(\w+):\s*\w+\[\]\s*=/g, 'const $1 =');

  // Remove dangling component names at the end
  sanitized = sanitized.replace(/^\s*\w+;\s*$/gm, '');

  // Fix incomplete getActions functions and JSX elements
  sanitized = sanitized.replace(
    /}\s*label=/g,
    'React.createElement(GridActionsCellItem, { label:'
  );
  sanitized = sanitized.replace(
    /\/>,\s*}\s*label=/g,
    '}),\n              React.createElement(GridActionsCellItem, { label:'
  );

  // Clean up any remaining incomplete JSX
  sanitized = sanitized.replace(/^\s*}\s*$/gm, '');

  // Fix empty return statements with proper closing
  sanitized = sanitized.replace(
    /return\s*\(\s*\n\s*\);/g,
    'return React.createElement("div", null, "Component");'
  );

  // Convert template literals to string concatenation
  sanitized = sanitized.replace(/`([^`]*)`/g, (match, content) => {
    if (!content.includes('${')) {
      // Simple template literal without variables
      return `'${content}'`;
    }

    // Template literal with variables - convert to string concatenation
    let result = '';
    let parts = content.split(/\$\{([^}]+)\}/);

    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        // String part
        if (parts[i]) {
          if (result) result += ' + ';
          result += `'${parts[i]}'`;
        }
      } else {
        // Variable part
        if (result) result += ' + ';
        result += parts[i];
      }
    }

    return result || "''";
  });

  // Add variable injection at the top
  const variableInjection = `
// Variable safety injection
var params = params || {};
var row = params.row || {};
var id = params.id || row.id || null;
var user = params.user || row.user || { name: 'John Doe', email: 'john@example.com' };
var item = params.item || row.item || row;
var data = params.data || row.data || [];
`;

  // Replace common parameter patterns with safe variables
  sanitized = sanitized.replace(/params\.id/g, 'id');
  sanitized = sanitized.replace(/params\.row/g, 'row');
  sanitized = sanitized.replace(/params\.user/g, 'user');
  sanitized = sanitized.replace(/params\.item/g, 'item');
  sanitized = sanitized.replace(/params\.data/g, 'data');

  // Map icon names to their correct global names
  const iconMappings = {
    VisibilityIcon: 'Visibility',
    EditIcon: 'Edit',
    DeleteIcon: 'Delete',
    AddIcon: 'Add',
    SaveIcon: 'Save',
    CancelIcon: 'Cancel',
    SearchIcon: 'Search',
    FilterListIcon: 'FilterList',
    MoreVertIcon: 'MoreVert',
    MenuIcon: 'MenuIcon', // Note: Keep as MenuIcon to avoid conflict with Menu component
  };

  Object.entries(iconMappings).forEach(([importName, globalName]) => {
    const regex = new RegExp(importName, 'g');
    sanitized = sanitized.replace(regex, globalName);
  });

  return variableInjection + sanitized;
}

function generateHTML(code: string, componentName: string): string {
  const sanitizedCode = sanitizeCode(code, componentName);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://esm.sh https://cdn.skypack.dev; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src https://esm.sh https://cdn.skypack.dev;">
  <title>Component Preview</title>
  <link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap"
  />
  <link
    rel="stylesheet"
    href="https://fonts.googleapis.com/icon?family=Material+Icons"
  />
  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: "Roboto", "Helvetica", "Arial", sans-serif;
      background-color: #fafafa;
    }
    #root {
      width: 100%;
      height: 100%;
    }
    .error-boundary {
      padding: 16px;
      background-color: #ffebee;
      border: 1px solid #f44336;
      border-radius: 4px;
      color: #c62828;
      font-family: monospace;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  
  <script type="module">
    // Error handling
    window.onerror = function(msg, url, line, col, error) {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'preview-error',
          error: {
            message: msg,
            source: url,
            line: line,
            column: col,
            stack: error ? error.stack : null
          }
        }, '*');
      }
      return true;
    };
    
    window.addEventListener('unhandledrejection', function(event) {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'preview-error',
          error: {
            message: event.reason?.message || 'Unhandled promise rejection',
            stack: event.reason?.stack || null
          }
        }, '*');
      }
    });

    try {
      // Import React and MUI from ESM CDN
      const [
        { default: React, createElement, useState, useEffect, useCallback, useMemo },
        { createRoot },
        MaterialUI,
        MaterialUIIcons
      ] = await Promise.all([
        import('https://esm.sh/react@18'),
        import('https://esm.sh/react-dom@18/client'),
        import('https://esm.sh/@mui/material@5.15.0'),
        import('https://esm.sh/@mui/icons-material@5.15.0')
      ]);

      // Try to import DataGrid with fallback
      let MaterialUIGrid;
      try {
        MaterialUIGrid = await import('https://esm.sh/@mui/x-data-grid@8.11.3');
      } catch (error) {
        console.warn('Failed to load DataGrid from esm.sh, using fallback');
        MaterialUIGrid = null;
      }

      // Make React available globally for the component code
      window.React = React;
      window.createElement = createElement;
      window.useState = useState;
      window.useEffect = useEffect;
      window.useCallback = useCallback;
      window.useMemo = useMemo;

      // Destructure MUI components
      const {
        Box, Button, TextField, Typography, Card, CardContent, CardActions,
        Grid, Paper, Container, AppBar, Toolbar, IconButton, Menu, MenuItem,
        Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert,
        Chip, Avatar, List, ListItem, ListItemText, ListItemIcon, Divider,
        Drawer, FormControl, FormLabel, FormGroup, FormControlLabel,
        Checkbox, Radio, RadioGroup, Select, Switch, Slider, Rating,
        Accordion, AccordionSummary, AccordionDetails, Tabs, Tab, TabPanel,
        Badge, Breadcrumbs, Link, Pagination, Skeleton, SpeedDial,
        SpeedDialAction, SpeedDialIcon, Stepper, Step, StepLabel,
        Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
        Timeline, TimelineItem, TimelineSeparator, TimelineConnector,
        TimelineContent, TimelineDot, ToggleButton, ToggleButtonGroup,
        Tooltip, Zoom, Fade, Grow, Slide, Collapse, CircularProgress,
        LinearProgress, Backdrop
      } = MaterialUI;

      const {
        Add, Edit, Delete, Save, Cancel, Search, FilterList, MoreVert,
        Visibility, VisibilityOff, Home, Settings, AccountCircle,
        Notifications, Mail, Phone, LocationOn, Event, Work,
        School, Restaurant, LocalHospital, ShoppingCart, Flight,
        Hotel, DirectionsCar, Train, DirectionsBus, DirectionsWalk,
        Menu: MenuIcon, Close, ArrowBack, ArrowForward, ArrowUpward,
        ArrowDownward, Check, Clear, Info, Warning, Error: ErrorIcon,
        Help, Star, StarBorder, Favorite, FavoriteBorder, Share,
        BookmarkBorder, Bookmark, ThumbUp, ThumbDown, Comment,
        PlayArrow, Pause, Stop, VolumeUp, VolumeDown, VolumeMute
      } = MaterialUIIcons;

      // Handle DataGrid with fallback
      const DataGrid = MaterialUIGrid?.DataGrid || (({ rows = [], columns = [], ...props }) => {
        return React.createElement(
          'div',
          { 
            style: { 
              padding: '16px', 
              border: '1px solid #ddd', 
              borderRadius: '4px',
              minHeight: '400px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            } 
          },
          React.createElement('h4', { style: { margin: '0 0 16px 0' } }, 'Data Table'),
          React.createElement('div', { style: { fontSize: '14px', color: '#666' } }, 
            rows.length + ' rows, ' + columns.length + ' columns'),
          React.createElement('div', { style: { flex: 1, overflow: 'auto' } },
            React.createElement('table', { 
              style: { 
                width: '100%', 
                borderCollapse: 'collapse',
                fontSize: '14px'
              } 
            },
              React.createElement('thead', null,
                React.createElement('tr', null,
                  columns.map((col, i) => React.createElement('th', { 
                    key: i,
                    style: { 
                      border: '1px solid #ddd', 
                      padding: '8px', 
                      backgroundColor: '#f5f5f5',
                      textAlign: 'left'
                    }
                  }, col.headerName || col.field))
                )
              ),
              React.createElement('tbody', null,
                rows.slice(0, 10).map((row, i) => React.createElement('tr', { key: i },
                  columns.map((col, j) => React.createElement('td', { 
                    key: j,
                    style: { 
                      border: '1px solid #ddd', 
                      padding: '8px'
                    }
                  }, 
                    col.type === 'actions' && col.getActions ? 
                      React.createElement('div', { style: { display: 'flex', gap: '4px' } },
                        col.getActions({ row }).map((action, k) => 
                          React.createElement('button', {
                            key: k,
                            onClick: action.props?.onClick,
                            style: {
                              padding: '4px 8px',
                              border: '1px solid #ccc',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }
                          }, action.props?.label || 'Action')
                        )
                      ) :
                      row[col.field] || ''
                  ))
                ))
              )
            )
          )
        );
      });
      
      const GridColDef = MaterialUIGrid?.GridColDef || {};
      const GridActionsCellItem = MaterialUIGrid?.GridActionsCellItem || (({ icon, label, onClick, ...props }) => {
        return React.createElement('button', {
          onClick: onClick,
          style: {
            padding: '4px 8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          },
          ...props
        }, icon, label);
      });

      // Make all components available globally
      Object.assign(window, {
        Box, Button, TextField, Typography, Card, CardContent, CardActions,
        Grid, Paper, Container, AppBar, Toolbar, IconButton, Menu, MenuItem,
        Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert,
        Chip, Avatar, List, ListItem, ListItemText, ListItemIcon, Divider,
        Drawer, FormControl, FormLabel, FormGroup, FormControlLabel,
        Checkbox, Radio, RadioGroup, Select, Switch, Slider, Rating,
        Accordion, AccordionSummary, AccordionDetails, Tabs, Tab, TabPanel,
        Badge, Breadcrumbs, Link, Pagination, Skeleton, SpeedDial,
        SpeedDialAction, SpeedDialIcon, Stepper, Step, StepLabel,
        Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
        Timeline, TimelineItem, TimelineSeparator, TimelineConnector,
        TimelineContent, TimelineDot, ToggleButton, ToggleButtonGroup,
        Tooltip, Zoom, Fade, Grow, Slide, Collapse, CircularProgress,
        LinearProgress, Backdrop, DataGrid, GridColDef, GridActionsCellItem,
        Add, Edit, Delete, Save, Cancel, Search, FilterList, MoreVert,
        Visibility, VisibilityOff, Home, Settings, AccountCircle,
        Notifications, Mail, Phone, LocationOn, Event, Work,
        School, Restaurant, LocalHospital, ShoppingCart, Flight,
        Hotel, DirectionsCar, Train, DirectionsBus, DirectionsWalk,
        MenuIcon, Close, ArrowBack, ArrowForward, ArrowUpward,
        ArrowDownward, Check, Clear, Info, Warning, ErrorIcon,
        Help, Star, StarBorder, Favorite, FavoriteBorder, Share,
        BookmarkBorder, Bookmark, ThumbUp, ThumbDown, Comment,
        PlayArrow, Pause, Stop, VolumeUp, VolumeDown, VolumeMute
      });

      // Global variables for component safety
      window.params = window.params || {};
      window.row = window.params.row || {};
      window.id = window.params.id || window.row.id || null;
      window.user = window.params.user || window.row.user || { name: 'John Doe', email: 'john@example.com' };
      window.item = window.params.item || window.row.item || window.row;
      window.data = window.params.data || window.row.data || [];

      // Execute the component code
      const componentCode = \`
        ${sanitizedCode}
        
        // Return the component function
        if (typeof ${componentName} !== 'undefined') {
          return ${componentName};
        }
        
        // Try to find the component by looking for functions that start with uppercase
        const globalKeys = Object.keys(window);
        const componentNames = globalKeys.filter(key => 
          typeof window[key] === 'function' && 
          key[0] === key[0].toUpperCase() &&
          key !== 'React' &&
          !key.startsWith('Material') &&
          !key.startsWith('Grid') &&
          !key.startsWith('Error')
        );
        
        return componentNames.length > 0 ? window[componentNames[componentNames.length - 1]] : null;
      \`;
      
      const componentFunction = new Function(componentCode);

      const ComponentToRender = componentFunction();

      if (ComponentToRender) {
        const root = createRoot(document.getElementById('root'));
        root.render(createElement(ComponentToRender));
        
        // Notify parent of successful render
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: 'preview-ready'
          }, '*');
        }
      } else {
        throw new Error('No valid component found to render');
      }
    } catch (error) {
      console.error('Preview error:', error);
      
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-boundary';
      errorDiv.textContent = 'Error rendering component:\\n' + (error.stack || error.message);
      document.getElementById('root').appendChild(errorDiv);
      
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'preview-error',
          error: {
            message: error.message,
            stack: error.stack
          }
        }, '*');
      }
    }
  </script>
</body>
</html>`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: API.CompileRequest = await request.json();
    const { code, componentName = 'Component' } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Code is required and must be a string',
        } as API.CompileResponse,
        { status: 400 }
      );
    }

    console.log('Processing component:', componentName);
    console.log('Code length:', code.length);

    // Step 1: Safety checks
    const safetyCheck = performSafetyChecks(code);
    if (!safetyCheck.safe) {
      return NextResponse.json(
        {
          success: false,
          error: `Security violations detected: ${safetyCheck.violations.join(', ')}`,
        } as API.CompileResponse,
        { status: 400 }
      );
    }

    // Step 2: Generate HTML with sanitized code
    const html = generateHTML(code, componentName);

    const logs = [
      'Safety checks passed',
      'Code sanitization completed',
      `Generated HTML (${html.length} chars)`,
    ];

    console.log('Processing successful, HTML length:', html.length);

    return NextResponse.json({
      success: true,
      html,
      logs,
    } as API.CompileResponse);
  } catch (error) {
    console.error('Compile API error:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown compilation error',
      } as API.CompileResponse,
      { status: 500 }
    );
  }
}
