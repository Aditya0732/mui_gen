'use client';

import { useState, useCallback } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  AutoAwesome as GenerateIcon,
  Code as CodeIcon,
  Visibility as PreviewIcon,
  Download as DownloadIcon,
  Save as SaveIcon,
} from '@mui/icons-material';

import { CodeEditor } from '@/components/ui/CodeEditor';
// import { ComponentPreview } from '@/components/ui/ComponentPreview';
import { ComponentType } from '@/types';
import { useComponentGeneration } from '@/hooks/useComponentGeneration';
import ComponentPreview from '../ui/ComponentPreview';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role='tabpanel'
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

export function ComponentGenerator() {
  const [prompt, setPrompt] = useState('');
  const [selectedType, setSelectedType] = useState<ComponentType | ''>('');
  const [activeTab, setActiveTab] = useState(0);
  const [options, setOptions] = useState({
    theme: 'light' as 'light' | 'dark',
    typescript: true,
    accessibility: true,
  });

  const {
    generateComponent,
    generatedComponent,
    isGenerating,
    error,
    clearError,
  } = useComponentGeneration();

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    await generateComponent({
      prompt: prompt.trim(),
      preferredType: selectedType || undefined,
      options,
    });
  }, [prompt, selectedType, options, generateComponent]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleExport = useCallback(() => {
    if (!generatedComponent) return;

    const blob = new Blob([generatedComponent.code], {
      type: 'text/typescript',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedComponent.name}.tsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generatedComponent]);

  const componentTypes = Object.values(ComponentType).map(type => ({
    value: type,
    label: type.replace('MUI', 'MUI '),
  }));

  const examplePrompts = [
    'Create a data table with user information including name, email, and actions',
    'Build a contact form with name, email, message fields and validation',
    'Design a card component displaying product information with image and price',
    'Make a navigation drawer with menu items and icons',
    'Create a dialog for confirming delete actions',
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant='h4' component='h2' gutterBottom>
        Generate Component
      </Typography>

      <Grid container spacing={3}>
        {/* Input Section */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, height: 'fit-content' }}>
            <Typography variant='h6' gutterBottom>
              Describe Your Component
            </Typography>

            <TextField
              fullWidth
              multiline
              rows={4}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder='Describe the component you want to generate...'
              variant='outlined'
              sx={{ mb: 2 }}
              error={!!error}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Preferred Component Type (Optional)</InputLabel>
              <Select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value as ComponentType)}
                label='Preferred Component Type (Optional)'
              >
                <MenuItem value=''>
                  <em>Auto-detect</em>
                </MenuItem>
                {componentTypes.map(type => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ mb: 2 }}>
              <Typography variant='subtitle2' gutterBottom>
                Options
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={options.typescript}
                    onChange={e =>
                      setOptions(prev => ({
                        ...prev,
                        typescript: e.target.checked,
                      }))
                    }
                  />
                }
                label='TypeScript'
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={options.accessibility}
                    onChange={e =>
                      setOptions(prev => ({
                        ...prev,
                        accessibility: e.target.checked,
                      }))
                    }
                  />
                }
                label='Accessibility Features'
              />
            </Box>

            <Button
              fullWidth
              variant='contained'
              size='large'
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              startIcon={
                isGenerating ? <CircularProgress size={20} /> : <GenerateIcon />
              }
              sx={{ mb: 2 }}
            >
              {isGenerating ? 'Generating...' : 'Generate Component'}
            </Button>

            {error && (
              <Alert severity='error' onClose={clearError} sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box>
              <Typography variant='subtitle2' gutterBottom>
                Example Prompts
              </Typography>
              {examplePrompts.map((example, index) => (
                <Chip
                  key={index}
                  label={example}
                  onClick={() => setPrompt(example)}
                  sx={{
                    mb: 1,
                    mr: 1,
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                  }}
                  size='small'
                  variant='outlined'
                />
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Output Section */}
        <Grid item xs={12} lg={8}>
          {generatedComponent ? (
            <Paper
              sx={{ height: '600px', display: 'flex', flexDirection: 'column' }}
            >
              <Box sx={{ borderBottom: 1, borderColor: 'divider', p: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Typography variant='h6'>
                    {generatedComponent.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size='small'
                      startIcon={<DownloadIcon />}
                      onClick={handleExport}
                      variant='outlined'
                    >
                      Export
                    </Button>
                  </Box>
                </Box>

                <Tabs value={activeTab} onChange={handleTabChange}>
                  <Tab icon={<CodeIcon />} label='Code' iconPosition='start' />
                  <Tab
                    icon={<PreviewIcon />}
                    label='Preview'
                    iconPosition='start'
                  />
                </Tabs>
              </Box>

              <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                <TabPanel value={activeTab} index={0}>
                  <CodeEditor
                    value={generatedComponent.code}
                    language='typescript'
                    theme={options.theme}
                    readOnly
                    height='500px'
                  />
                </TabPanel>

                <TabPanel value={activeTab} index={1}>
                  <ComponentPreview
                    code={generatedComponent.code}
                    previewContent={(generatedComponent as any).previewContent}
                    theme={options.theme}
                    height='500px'
                  />
                </TabPanel>
              </Box>
            </Paper>
          ) : (
            <Paper
              sx={{
                height: '600px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'grey.50',
              }}
            >
              <Box textAlign='center'>
                <CodeIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                <Typography variant='h6' color='grey.600'>
                  Generated component will appear here
                </Typography>
                <Typography variant='body2' color='grey.500'>
                  Enter a description and click "Generate Component" to get
                  started
                </Typography>
              </Box>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
