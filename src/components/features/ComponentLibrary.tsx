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
} from '@mui/material';
import {
  Search as SearchIcon,
  Code as CodeIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { API } from '@/types/api';

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

  const loadComponents = async (searchTerm: string = '', currentPage: number = 1) => {
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

  const handlePageChange = (event: React.ChangeEvent<unknown>, newPage: number) => {
    setPage(newPage);
  };

  const handleViewComponent = (componentId: string) => {
    // TODO: Implement component detail view
    console.log('View component:', componentId);
  };

  const handleDownloadComponent = (componentId: string, componentName: string) => {
    // TODO: Implement component download
    console.log('Download component:', componentId, componentName);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Error loading components: {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h2" gutterBottom>
          Component Library
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Browse and reuse components from the community library
        </Typography>

        <TextField
          fullWidth
          placeholder="Search components..."
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
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
          <Typography variant="h6" color="grey.600" gutterBottom>
            {searchQuery ? 'No components found' : 'No components yet'}
          </Typography>
          <Typography variant="body2" color="grey.500">
            {searchQuery 
              ? 'Try adjusting your search terms'
              : 'Generate some components to populate the library'
            }
          </Typography>
        </Box>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Showing {components.length} of {totalComponents} components
          </Typography>

          <Grid container spacing={3}>
            {components.map((component) => (
              <Grid item xs={12} sm={6} md={4} key={component.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" component="h3" gutterBottom>
                      {component.name}
                    </Typography>
                    
                    <Chip 
                      label={component.type.replace('MUI', 'MUI ')} 
                      size="small" 
                      color="primary"
                      sx={{ mb: 1 }}
                    />
                    
                    {component.description && (
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ mb: 2 }}
                      >
                        {component.description}
                      </Typography>
                    )}

                    {component.tags.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        {component.tags.slice(0, 3).map((tag) => (
                          <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            variant="outlined"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                        {component.tags.length > 3 && (
                          <Chip
                            label={`+${component.tags.length - 3} more`}
                            size="small"
                            variant="outlined"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        )}
                      </Box>
                    )}

                    <Typography variant="caption" color="text.secondary">
                      Used {component.usageCount} times • Updated {formatDate(component.updatedAt)}
                    </Typography>
                  </CardContent>

                  <CardActions>
                    <Button
                      size="small"
                      startIcon={<ViewIcon />}
                      onClick={() => handleViewComponent(component.id)}
                    >
                      View
                    </Button>
                    <Button
                      size="small"
                      startIcon={<DownloadIcon />}
                      onClick={() => handleDownloadComponent(component.id, component.name)}
                    >
                      Download
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
                color="primary"
                size="large"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
