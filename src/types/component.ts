import { z } from 'zod';

// Component Types Enum
export enum ComponentType {
  MUITable = 'MUITable',
  MUIButton = 'MUIButton',
  MUIForm = 'MUIForm',
  MUIDialog = 'MUIDialog',
  MUICard = 'MUICard',
  MUITabs = 'MUITabs',
  MUIList = 'MUIList',
  MUIChip = 'MUIChip',
  MUIAvatar = 'MUIAvatar',
  MUIBadge = 'MUIBadge',
  MUITooltip = 'MUITooltip',
  MUIMenu = 'MUIMenu',
  MUIDrawer = 'MUIDrawer',
  MUIAppBar = 'MUIAppBar',
  MUIBottomNavigation = 'MUIBottomNavigation',
  MUIBreadcrumbs = 'MUIBreadcrumbs',
  MUIFab = 'MUIFab',
  MUISpeedDial = 'MUISpeedDial',
  MUIStepper = 'MUIStepper',
  MUITimeline = 'MUITimeline',
  MUIAlert = 'MUIAlert',
  MUISnackbar = 'MUISnackbar',
  MUIBackdrop = 'MUIBackdrop',
  MUISkeleton = 'MUISkeleton',
  MUIProgress = 'MUIProgress',
  MUIRating = 'MUIRating',
  MUISlider = 'MUISlider',
  MUISwitch = 'MUISwitch',
  MUIToggleButton = 'MUIToggleButton',
  MUIAutocomplete = 'MUIAutocomplete',
  MUIDatePicker = 'MUIDatePicker',
  MUITimePicker = 'MUITimePicker',
  Custom = 'Custom',
}

// Prop Schema Definition
export const PropSchemaItem = z.object({
  name: z.string(),
  type: z.string(),
  required: z.boolean().default(false),
  description: z.string().optional(),
  defaultValue: z.any().optional(),
  validation: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
      enum: z.array(z.string()).optional(),
    })
    .optional(),
});

export type PropSchemaItem = z.infer<typeof PropSchemaItem>;

export const PropsSchema = z.object({
  props: z.array(PropSchemaItem),
  interfaces: z.record(z.string(), z.array(PropSchemaItem)).optional(),
});

export type PropsSchema = z.infer<typeof PropsSchema>;

// Component Generation Schema
export const ComponentGenerationSchema = z.object({
  componentType: z.nativeEnum(ComponentType),
  componentName: z.string().regex(/^[A-Z][a-zA-Z0-9]*$/),
  propsSchema: PropsSchema,
  code: z.string(),
  previewContent: z.string(),
  variants: z.array(z.string()).optional(),
  description: z.string().optional(),
  examples: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type ComponentGeneration = z.infer<typeof ComponentGenerationSchema>;

// Component Candidate (for ranking)
export const ComponentCandidate = z.object({
  type: z.nativeEnum(ComponentType),
  score: z.number().min(0).max(1),
  reason: z.string(),
  confidence: z.number().min(0).max(1),
});

export type ComponentCandidate = z.infer<typeof ComponentCandidate>;

// Component Metadata
export interface ComponentMetadata {
  version: string;
  author?: string;
  license?: string;
  keywords: string[];
  category: string;
  complexity: 'simple' | 'medium' | 'complex';
  estimatedLines: number;
  dependencies: string[];
  lastModified: Date;
  usageStats?: {
    totalGenerations: number;
    successRate: number;
    avgRating?: number;
  };
}

// Template Configuration
export interface TemplateConfig {
  componentType: ComponentType;
  templatePath: string;
  placeholders: string[];
  requiredProps: string[];
  optionalProps: string[];
  dependencies: string[];
  examples: string[];
}

// Component Export Options
export interface ExportOptions {
  format: 'tsx' | 'js' | 'ts';
  includeTypes: boolean;
  includeExamples: boolean;
  includeComments: boolean;
  bundleImports: boolean;
  minify: boolean;
}

// Component Validation Result
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

export interface ValidationError {
  type: 'syntax' | 'type' | 'import' | 'security' | 'accessibility';
  message: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationWarning {
  type: 'performance' | 'best-practice' | 'accessibility';
  message: string;
  line?: number;
  column?: number;
}

// Component Library Item
export interface ComponentLibraryItem {
  id: string;
  name: string;
  type: ComponentType;
  description?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
  rating?: number;
  thumbnail?: string;
  metadata: ComponentMetadata;
}

// Search and Filter Options
export interface ComponentSearchOptions {
  query?: string;
  types?: ComponentType[];
  tags?: string[];
  complexity?: ComponentMetadata['complexity'][];
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'usageCount' | 'rating';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}
