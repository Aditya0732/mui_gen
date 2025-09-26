'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  InputAdornment,
  Pagination,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  IconButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  Code as CodeIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  Preview as PreviewIcon,
} from '@mui/icons-material';
import { API } from '@/types/api';
import { CodeEditor } from '@/components/ui/CodeEditor';
import ComponentPreview from '@/components/ui/ComponentPreview';

interface ComponentItem {
  id: string;
  name: string;
  type: string;
  description?: string;
  tags: string[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export function ComponentLibrary() {
  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalComponents, setTotalComponents] = useState(0);
  const [downloadingComponents, setDownloadingComponents] = useState<
    Set<string>
  >(new Set());

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] =
    useState<ComponentItem | null>(null);
  const [selectedComponentCode, setSelectedComponentCode] =
    useState<string>('');
  const [dialogActiveTab, setDialogActiveTab] = useState(0);
  const [loadingComponentDetails, setLoadingComponentDetails] = useState(false);

  const loadComponents = async (
    searchTerm: string = '',
    currentPage: number = 1
  ) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: '12',
        offset: ((currentPage - 1) * 12).toString(),
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      });

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`/api/components?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to load components');
      }

      if (data.success) {
        setComponents(data.data.items);
        setTotalPages(data.data.meta.totalPages);
        setTotalComponents(data.data.meta.total);
      } else {
        throw new Error(data.error?.message || 'Failed to load components');
      }
    } catch (err) {
      console.error('Load components error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComponents(searchQuery, page);
  }, [searchQuery, page]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setPage(1); // Reset to first page when searching
  };

  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    newPage: number
  ) => {
    setPage(newPage);
  };

  const handleViewComponent = async (componentId: string) => {
    const component = components.find(c => c.id === componentId);
    if (!component) return;

    setSelectedComponent(component);
    setLoadingComponentDetails(true);
    setDialogOpen(true);
    setDialogActiveTab(0); // Start with code tab

    try {
      // Fetch the component details including the code
      const response = await fetch(`/api/components/${componentId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch component');
      }

      if (data.success && data.data.component) {
        setSelectedComponentCode(data.data.component.code);
      } else {
        throw new Error('Component code not found');
      }
    } catch (err) {
      console.error('View component error:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load component details'
      );
    } finally {
      setLoadingComponentDetails(false);
    }
  };

  const handleDownloadComponent = async (
    componentId: string,
    componentName: string
  ) => {
    // Add component to downloading set
    setDownloadingComponents(prev => new Set(prev).add(componentId));

    try {
      // Fetch the component details including the code
      const response = await fetch(`/api/components/${componentId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch component');
      }

      if (data.success && data.data.component) {
        const component = data.data.component;

        // Create and download the file
        const blob = new Blob([component.code], {
          type: 'text/typescript',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${componentName}.tsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        throw new Error('Component code not found');
      }
    } catch (err) {
      console.error('Download component error:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to download component'
      );
    } finally {
      // Remove component from downloading set
      setDownloadingComponents(prev => {
        const newSet = new Set(prev);
        newSet.delete(componentId);
        return newSet;
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedComponent(null);
    setSelectedComponentCode('');
    setDialogActiveTab(0);
  };

  const handleDialogTabChange = (
    event: React.SyntheticEvent,
    newValue: number
  ) => {
    setDialogActiveTab(newValue);
  };

  const handleDownloadFromDialog = () => {
    if (selectedComponent) {
      handleDownloadComponent(selectedComponent.id, selectedComponent.name);
    }
  };

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity='error'>Error loading components: {error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant='h4' component='h2' gutterBottom>
          Component Library
        </Typography>

        <Typography variant='body1' color='text.secondary' sx={{ mb: 3 }}>
          Browse and reuse components from the community library
        </Typography>

        <TextField
          fullWidth
          placeholder='Search components...'
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position='start'>
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: 500 }}
        />
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : components.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CodeIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
          <Typography variant='h6' color='grey.600' gutterBottom>
            {searchQuery ? 'No components found' : 'No components yet'}
          </Typography>
          <Typography variant='body2' color='grey.500'>
            {searchQuery
              ? 'Try adjusting your search terms'
              : 'Generate some components to populate the library'}
          </Typography>
        </Box>
      ) : (
        <>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
            Showing {components.length} of {totalComponents} components
          </Typography>

          <Grid container spacing={3}>
            {components.map(component => (
              <Grid item xs={12} sm={6} md={4} key={component.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant='h6' component='h3' gutterBottom>
                      {component.name}
                    </Typography>

                    <Chip
                      label={component.type.replace('MUI', 'MUI ')}
                      size='small'
                      color='primary'
                      sx={{ mb: 1 }}
                    />

                    {component.description && (
                      <Typography
                        variant='body2'
                        color='text.secondary'
                        sx={{ mb: 2 }}
                      >
                        {component.description}
                      </Typography>
                    )}

                    {component.tags.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        {component.tags.slice(0, 3).map(tag => (
                          <Chip
                            key={tag}
                            label={tag}
                            size='small'
                            variant='outlined'
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                        {component.tags.length > 3 && (
                          <Chip
                            label={`+${component.tags.length - 3} more`}
                            size='small'
                            variant='outlined'
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        )}
                      </Box>
                    )}

                    <Typography variant='caption' color='text.secondary'>
                      • Updated {formatDate(component.updatedAt)}
                    </Typography>
                  </CardContent>

                  <CardActions>
                    <Button
                      size='small'
                      startIcon={<ViewIcon />}
                      onClick={() => handleViewComponent(component.id)}
                    >
                      View
                    </Button>
                    <Button
                      size='small'
                      startIcon={
                        downloadingComponents.has(component.id) ? (
                          <CircularProgress size={16} />
                        ) : (
                          <DownloadIcon />
                        )
                      }
                      onClick={() =>
                        handleDownloadComponent(component.id, component.name)
                      }
                      disabled={downloadingComponents.has(component.id)}
                    >
                      {downloadingComponents.has(component.id)
                        ? 'Downloading...'
                        : 'Download'}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color='primary'
                size='large'
              />
            </Box>
          )}
        </>
      )}

      {/* Component View Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        maxWidth='lg'
        fullWidth
        sx={{ '& .MuiDialog-paper': { height: '80vh' } }}
      >
        <DialogTitle>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box>
              <Typography variant='h6'>{selectedComponent?.name}</Typography>
              {selectedComponent && (
                <Chip
                  label={selectedComponent.type.replace('MUI', 'MUI ')}
                  size='small'
                  color='primary'
                  sx={{ mt: 0.5 }}
                />
              )}
            </Box>
            <IconButton onClick={handleDialogClose} size='small'>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
            <Tabs value={dialogActiveTab} onChange={handleDialogTabChange}>
              <Tab icon={<CodeIcon />} label='Code' iconPosition='start' />
              <Tab
                icon={<PreviewIcon />}
                label='Preview'
                iconPosition='start'
              />
            </Tabs>
          </Box>

          <Box sx={{ height: 'calc(100% - 48px)', overflow: 'hidden' }}>
            {/* Code Tab */}
            {dialogActiveTab === 0 && (
              <Box sx={{ height: '100%', p: 2 }}>
                {loadingComponentDetails ? (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '100%',
                    }}
                  >
                    <CircularProgress />
                  </Box>
                ) : (
                  <CodeEditor
                    value={selectedComponentCode}
                    language='typescript'
                    theme='light'
                    readOnly
                    height='100%'
                  />
                )}
              </Box>
            )}

            {/* Preview Tab */}
            {dialogActiveTab === 1 && (
              <Box sx={{ height: '100%', p: 2 }}>
                {loadingComponentDetails ? (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '100%',
                    }}
                  >
                    <CircularProgress />
                  </Box>
                ) : selectedComponentCode ? (
                  <ComponentPreview
                    code={selectedComponentCode}
                    theme='light'
                    height='100%'
                  />
                ) : (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '100%',
                    }}
                  >
                    <Typography color='text.secondary'>
                      No preview available
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button
            startIcon={
              downloadingComponents.has(selectedComponent?.id || '') ? (
                <CircularProgress size={16} />
              ) : (
                <DownloadIcon />
              )
            }
            onClick={handleDownloadFromDialog}
            disabled={
              !selectedComponent ||
              downloadingComponents.has(selectedComponent?.id || '')
            }
            variant='contained'
          >
            {downloadingComponents.has(selectedComponent?.id || '')
              ? 'Downloading...'
              : 'Download'}
          </Button>
          <Button onClick={handleDialogClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
