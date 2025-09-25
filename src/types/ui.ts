import { ReactNode } from 'react';

// Theme Types
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeConfig {
  mode: ThemeMode;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  borderRadius: number;
  spacing: number;
}

// UI Component Props
export interface ButtonProps {
  children: ReactNode;
  variant?: 'text' | 'outlined' | 'contained';
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  disabled?: boolean;
  loading?: boolean;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  fullWidth?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  'aria-label'?: string;
}

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  fullScreen?: boolean;
  disableEscapeKeyDown?: boolean;
  disableBackdropClick?: boolean;
}

export interface SnackbarProps {
  open: boolean;
  message: string;
  severity?: 'success' | 'error' | 'warning' | 'info';
  autoHideDuration?: number;
  onClose: () => void;
  action?: ReactNode;
  anchorOrigin?: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };
}

// Loading States
export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
  progress?: number;
}

// Modal Types
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
}

// Form Types
export interface FormFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export interface TextFieldProps extends FormFieldProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  multiline?: boolean;
  rows?: number;
  maxRows?: number;
  variant?: 'outlined' | 'filled' | 'standard';
  size?: 'small' | 'medium';
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
}

export interface SelectFieldProps extends FormFieldProps {
  options: Array<{
    value: string | number;
    label: string;
    disabled?: boolean;
  }>;
  multiple?: boolean;
  variant?: 'outlined' | 'filled' | 'standard';
  size?: 'small' | 'medium';
}

// Table Types
export interface TableColumn {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  filterable?: boolean;
  format?: (value: any) => string;
}

export interface TableProps {
  columns: TableColumn[];
  rows: any[];
  loading?: boolean;
  pagination?: {
    page: number;
    rowsPerPage: number;
    count: number;
    onPageChange: (page: number) => void;
    onRowsPerPageChange: (rowsPerPage: number) => void;
  };
  sorting?: {
    orderBy: string;
    order: 'asc' | 'desc';
    onSort: (column: string) => void;
  };
  selection?: {
    selected: string[];
    onSelectionChange: (selected: string[]) => void;
  };
  actions?: Array<{
    label: string;
    icon?: ReactNode;
    onClick: (row: any) => void;
    disabled?: (row: any) => boolean;
  }>;
}

// Navigation Types
export interface NavigationItem {
  id: string;
  label: string;
  path?: string;
  icon?: ReactNode;
  badge?: string | number;
  disabled?: boolean;
  children?: NavigationItem[];
  onClick?: () => void;
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
  onClick?: () => void;
}

// Layout Types
export interface LayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  navigation?: NavigationItem[];
  breadcrumbs?: BreadcrumbItem[];
}

// Error Types
export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

export interface ErrorDisplayProps {
  error: Error | string;
  title?: string;
  actions?: ReactNode;
  variant?: 'page' | 'inline' | 'toast';
  severity?: 'error' | 'warning';
}

// Code Editor Types
export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  theme?: 'light' | 'dark';
  readOnly?: boolean;
  height?: string | number;
  width?: string | number;
  options?: {
    fontSize?: number;
    lineNumbers?: boolean;
    wordWrap?: boolean;
    minimap?: boolean;
    folding?: boolean;
    autoClosingBrackets?: boolean;
    autoClosingQuotes?: boolean;
    formatOnPaste?: boolean;
    formatOnType?: boolean;
  };
  onMount?: (editor: any, monaco: any) => void;
}

// Preview Types
export interface PreviewProps {
  code: string;
  theme: ThemeMode;
  props?: Record<string, any>;
  width?: string | number;
  height?: string | number;
  loading?: boolean;
  error?: string;
  onLoad?: () => void;
  onError?: (error: string) => void;
}

// Search and Filter Types
export interface SearchFilters {
  query?: string;
  category?: string;
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult<T = any> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Animation Types
export interface AnimationProps {
  duration?: number;
  delay?: number;
  easing?: string;
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
  iterationCount?: number | 'infinite';
}

// Responsive Types
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ResponsiveValue<T> {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
}

// Accessibility Types
export interface AccessibilityProps {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-hidden'?: boolean;
  'aria-live'?: 'polite' | 'assertive' | 'off';
  role?: string;
  tabIndex?: number;
}
