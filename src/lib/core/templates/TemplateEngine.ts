import { ComponentType } from '@/types';
import { ITemplateEngine } from '../../domain/services/ComponentGenerationService';

export interface TemplateContext {
  componentName: string;
  props: Array<{
    name: string;
    type: string;
    required: boolean;
    defaultValue?: any;
  }>;
  imports: string[];
  interfaces: string[];
  methods: string[];
  styles?: Record<string, any>;
  examples?: string[];
}

export class TemplateEngine implements ITemplateEngine {
  private templates: Map<ComponentType, string> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  async generateFromTemplate(
    componentType: ComponentType,
    context: TemplateContext
  ): Promise<string> {
    const template = this.templates.get(componentType);
    
    if (!template) {
      throw new Error(`Template not found for component type: ${componentType}`);
    }

    return this.processTemplate(template, context);
  }

  getAvailableTemplates(): ComponentType[] {
    return Array.from(this.templates.keys());
  }

  async validateTemplate(componentType: ComponentType): Promise<boolean> {
    return this.templates.has(componentType);
  }

  private initializeTemplates(): void {
    // MUI Table Template
    this.templates.set(ComponentType.MUITable, `
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  {{#if hasActions}}
  IconButton,
  {{/if}}
  {{#if hasPagination}}
  TablePagination,
  {{/if}}
} from '@mui/material';
{{#if hasActions}}
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
{{/if}}

{{#each interfaces}}
{{{this}}}
{{/each}}

interface {{componentName}}Props {
  {{#each props}}
  {{name}}{{#unless required}}?{{/unless}}: {{type}};
  {{/each}}
}

const {{componentName}}: React.FC<{{componentName}}Props> = ({
  {{#each props}}
  {{name}}{{#if defaultValue}} = {{defaultValue}}{{/if}},
  {{/each}}
}) => {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            {{#each columns}}
            <TableCell{{#if align}} align="{{align}}"{{/if}}>{{label}}</TableCell>
            {{/each}}
            {{#if hasActions}}
            <TableCell align="right">Actions</TableCell>
            {{/if}}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={row.id || index}>
              {{#each columns}}
              <TableCell{{#if align}} align="{{align}}"{{/if}}>
                {{{#if format}}{{format}}(row.{{field}}){{else}}row.{{field}}{{/if}}}
              </TableCell>
              {{/each}}
              {{#if hasActions}}
              <TableCell align="right">
                <IconButton onClick={() => onEdit?.(row)} size="small">
                  <EditIcon />
                </IconButton>
                <IconButton onClick={() => onDelete?.(row)} size="small">
                  <DeleteIcon />
                </IconButton>
              </TableCell>
              {{/if}}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {{#if hasPagination}}
      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        onPageChange={onPageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={onRowsPerPageChange}
      />
      {{/if}}
    </TableContainer>
  );
};

export default {{componentName}};
`);

    // MUI Button Template
    this.templates.set(ComponentType.MUIButton, `
import React from 'react';
import { Button{{#if hasIcon}}, SvgIcon{{/if}} } from '@mui/material';
{{#if hasIcon}}
import { {{iconName}} } from '@mui/icons-material';
{{/if}}

interface {{componentName}}Props {
  {{#each props}}
  {{name}}{{#unless required}}?{{/unless}}: {{type}};
  {{/each}}
}

const {{componentName}}: React.FC<{{componentName}}Props> = ({
  {{#each props}}
  {{name}}{{#if defaultValue}} = {{defaultValue}}{{/if}},
  {{/each}}
}) => {
  return (
    <Button
      variant="{{variant}}"
      size="{{size}}"
      color="{{color}}"
      disabled={disabled}
      fullWidth={fullWidth}
      onClick={onClick}
      {{#if hasStartIcon}}
      startIcon={startIcon{{#if iconName}} || <{{iconName}} />{{/if}}}
      {{/if}}
      {{#if hasEndIcon}}
      endIcon={endIcon{{#if iconName}} || <{{iconName}} />{{/if}}}
      {{/if}}
      {...props}
    >
      {children}
    </Button>
  );
};

export default {{componentName}};
`);

    // MUI Form Template
    this.templates.set(ComponentType.MUIForm, `
import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  TextField,
  Button,
  Typography,
  {{#if hasSelect}}
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  {{/if}}
  {{#if hasCheckbox}}
  FormControlLabel,
  Checkbox,
  {{/if}}
} from '@mui/material';

{{#each interfaces}}
{{{this}}}
{{/each}}

interface {{componentName}}Props {
  {{#each props}}
  {{name}}{{#unless required}}?{{/unless}}: {{type}};
  {{/each}}
}

const {{componentName}}: React.FC<{{componentName}}Props> = ({
  {{#each props}}
  {{name}}{{#if defaultValue}} = {{defaultValue}}{{/if}},
  {{/each}}
}) => {
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: defaultValues,
  });

  const onSubmit = (data: FormData) => {
    onSubmitForm?.(data);
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ maxWidth: 600 }}>
      {{#if title}}
      <Typography variant="h5" component="h2" gutterBottom>
        {{title}}
      </Typography>
      {{/if}}
      
      {{#each fields}}
      {{#if (eq type "text")}}
      <Controller
        name="{{name}}"
        control={control}
        rules={{
          required: {{required}},
          {{#if validation}}
          {{#if validation.minLength}}minLength: {{validation.minLength}},{{/if}}
          {{#if validation.maxLength}}maxLength: {{validation.maxLength}},{{/if}}
          {{#if validation.pattern}}pattern: {{validation.pattern}},{{/if}}
          {{/if}}
        }}
        render={({ field }) => (
          <TextField
            {...field}
            fullWidth
            label="{{label}}"
            placeholder="{{placeholder}}"
            error={!!errors.{{name}}}
            helperText={errors.{{name}}?.message}
            margin="normal"
            {{#if multiline}}
            multiline
            rows={{{rows}}}
            {{/if}}
          />
        )}
      />
      {{/if}}
      
      {{#if (eq type "select")}}
      <Controller
        name="{{name}}"
        control={control}
        rules={{ required: {{required}} }}
        render={({ field }) => (
          <FormControl fullWidth margin="normal" error={!!errors.{{name}}}>
            <InputLabel>{{label}}</InputLabel>
            <Select {...field} label="{{label}}">
              {{#each options}}
              <MenuItem value="{{value}}">{{label}}</MenuItem>
              {{/each}}
            </Select>
          </FormControl>
        )}
      />
      {{/if}}
      
      {{#if (eq type "checkbox")}}
      <Controller
        name="{{name}}"
        control={control}
        render={({ field }) => (
          <FormControlLabel
            control={<Checkbox {...field} checked={field.value} />}
            label="{{label}}"
          />
        )}
      />
      {{/if}}
      {{/each}}

      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button type="submit" variant="contained" color="primary">
          {{submitText}}
        </Button>
        {{#if showReset}}
        <Button type="button" variant="outlined" onClick={() => reset()}>
          {{resetText}}
        </Button>
        {{/if}}
      </Box>
    </Box>
  );
};

export default {{componentName}};
`);

    // MUI Dialog Template
    this.templates.set(ComponentType.MUIDialog, `
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  IconButton,
  {{#if hasTextField}}
  TextField,
  {{/if}}
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

interface {{componentName}}Props {
  {{#each props}}
  {{name}}{{#unless required}}?{{/unless}}: {{type}};
  {{/each}}
}

const {{componentName}}: React.FC<{{componentName}}Props> = ({
  {{#each props}}
  {{name}}{{#if defaultValue}} = {{defaultValue}}{{/if}},
  {{/each}}
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="{{maxWidth}}"
      fullWidth={fullWidth}
      {{#if fullScreen}}
      fullScreen={fullScreen}
      {{/if}}
    >
      {{#if title}}
      <DialogTitle>
        {title}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      {{/if}}
      
      <DialogContent{{#if dividers}} dividers{{/if}}>
        {children}
        {{#if content}}
        <Typography>
          {content}
        </Typography>
        {{/if}}
      </DialogContent>
      
      {{#if hasActions}}
      <DialogActions>
        {{#if showCancel}}
        <Button onClick={onClose} color="inherit">
          {{cancelText}}
        </Button>
        {{/if}}
        {{#if showConfirm}}
        <Button onClick={onConfirm} variant="contained" color="primary">
          {{confirmText}}
        </Button>
        {{/if}}
        {actions}
      </DialogActions>
      {{/if}}
    </Dialog>
  );
};

export default {{componentName}};
`);

    // MUI Card Template
    this.templates.set(ComponentType.MUICard, `
import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  CardMedia,
  Typography,
  Button,
  {{#if hasAvatar}}
  Avatar,
  CardHeader,
  {{/if}}
} from '@mui/material';

interface {{componentName}}Props {
  {{#each props}}
  {{name}}{{#unless required}}?{{/unless}}: {{type}};
  {{/each}}
}

const {{componentName}}: React.FC<{{componentName}}Props> = ({
  {{#each props}}
  {{name}}{{#if defaultValue}} = {{defaultValue}}{{/if}},
  {{/each}}
}) => {
  return (
    <Card sx={{ maxWidth: {{maxWidth}} }}>
      {{#if hasHeader}}
      <CardHeader
        {{#if hasAvatar}}
        avatar={avatar || <Avatar>{title?.charAt(0)}</Avatar>}
        {{/if}}
        title={title}
        subheader={subtitle}
        action={headerAction}
      />
      {{/if}}
      
      {{#if hasMedia}}
      <CardMedia
        component="img"
        height="{{mediaHeight}}"
        image={image}
        alt={imageAlt}
      />
      {{/if}}
      
      <CardContent>
        {{#if hasTitle}}
        <Typography gutterBottom variant="h5" component="div">
          {title}
        </Typography>
        {{/if}}
        
        {{#if hasSubtitle}}
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
        {{/if}}
        
        <Typography variant="body2" color="text.secondary">
          {content}
        </Typography>
        
        {children}
      </CardContent>
      
      {{#if hasActions}}
      <CardActions>
        {{#each actionButtons}}
        <Button size="small" color="{{color}}" onClick={{{onClick}}}>
          {{label}}
        </Button>
        {{/each}}
        {actions}
      </CardActions>
      {{/if}}
    </Card>
  );
};

export default {{componentName}};
`);
  }

  private processTemplate(template: string, context: TemplateContext): string {
    let processed = template;

    // Replace component name
    processed = processed.replace(/\{\{componentName\}\}/g, context.componentName);

    // Process conditional blocks
    processed = this.processConditionals(processed, context);

    // Process loops
    processed = this.processLoops(processed, context);

    // Replace simple variables
    processed = this.processVariables(processed, context);

    // Clean up extra whitespace and empty lines
    processed = this.cleanupTemplate(processed);

    return processed;
  }

  private processConditionals(template: string, context: any): string {
    // Process {{#if condition}} blocks
    const ifRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    
    return template.replace(ifRegex, (match, condition, content) => {
      const value = this.getNestedValue(context, condition);
      return value ? content : '';
    });
  }

  private processLoops(template: string, context: any): string {
    // Process {{#each array}} blocks
    const eachRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
    
    return template.replace(eachRegex, (match, arrayName, itemTemplate) => {
      const array = this.getNestedValue(context, arrayName);
      
      if (!Array.isArray(array)) {
        return '';
      }

      return array.map((item, index) => {
        let processedItem = itemTemplate;
        
        // Replace {{this}} with the current item
        processedItem = processedItem.replace(/\{\{this\}\}/g, String(item));
        
        // Replace {{@index}} with the current index
        processedItem = processedItem.replace(/\{\{@index\}\}/g, String(index));
        
        // Replace item properties
        if (typeof item === 'object' && item !== null) {
          Object.keys(item).forEach(key => {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            processedItem = processedItem.replace(regex, String(item[key]));
          });
        }
        
        return processedItem;
      }).join('');
    });
  }

  private processVariables(template: string, context: any): string {
    // Replace simple variables {{variable}}
    const variableRegex = /\{\{(\w+(?:\.\w+)*)\}\}/g;
    
    return template.replace(variableRegex, (match, path) => {
      const value = this.getNestedValue(context, path);
      return value !== undefined ? String(value) : match;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private cleanupTemplate(template: string): string {
    return template
      // Remove extra empty lines
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // Remove leading/trailing whitespace
      .trim()
      // Fix indentation issues
      .replace(/^[ \t]+$/gm, '');
  }

  // Helper methods for template context preparation
  public static prepareTableContext(
    componentName: string,
    columns: Array<{ field: string; label: string; align?: string }>,
    options: {
      hasActions?: boolean;
      hasPagination?: boolean;
      hasSelection?: boolean;
    } = {}
  ): TemplateContext {
    return {
      componentName,
      props: [
        { name: 'rows', type: 'any[]', required: true },
        { name: 'columns', type: 'TableColumn[]', required: false },
        ...(options.hasActions ? [
          { name: 'onEdit', type: '(row: any) => void', required: false },
          { name: 'onDelete', type: '(row: any) => void', required: false },
        ] : []),
        ...(options.hasPagination ? [
          { name: 'page', type: 'number', required: false, defaultValue: 0 },
          { name: 'rowsPerPage', type: 'number', required: false, defaultValue: 10 },
          { name: 'totalCount', type: 'number', required: true },
          { name: 'onPageChange', type: '(page: number) => void', required: false },
          { name: 'onRowsPerPageChange', type: '(rowsPerPage: number) => void', required: false },
        ] : []),
      ],
      imports: ['@mui/material', '@mui/icons-material'],
      interfaces: [],
      methods: [],
      // Additional template-specific data
      columns,
      hasActions: options.hasActions,
      hasPagination: options.hasPagination,
    } as any;
  }

  public static prepareFormContext(
    componentName: string,
    fields: Array<{
      name: string;
      type: string;
      label: string;
      required?: boolean;
      validation?: any;
    }>,
    options: {
      title?: string;
      submitText?: string;
      showReset?: boolean;
    } = {}
  ): TemplateContext {
    return {
      componentName,
      props: [
        { name: 'defaultValues', type: 'Partial<FormData>', required: false },
        { name: 'onSubmitForm', type: '(data: FormData) => void', required: false },
        { name: 'title', type: 'string', required: false },
      ],
      imports: ['@mui/material', 'react-hook-form'],
      interfaces: [
        `interface FormData {
          ${fields.map(f => `${f.name}${f.required ? '' : '?'}: ${f.type};`).join('\n  ')}
        }`
      ],
      methods: [],
      // Additional template-specific data
      fields,
      title: options.title,
      submitText: options.submitText || 'Submit',
      showReset: options.showReset,
    } as any;
  }
}
