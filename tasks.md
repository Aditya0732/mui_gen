# MUI Component Library Generator - Task List

## Project Overview

Building a v0.dev-style component generator that processes plain-English prompts and generates valid React+TypeScript+MUI components with accessibility compliance, theme support, and sandboxed preview.

## Core Requirements

- 80% intent mapping accuracy with ranked suggestions
- Valid TypeScript compilation (tsc)
- Only @mui/material imports (+ @mui/x-data-grid, react-hook-form where applicable)
- Sandboxed iframe preview with <2s load time
- WCAG 2.1 AA compliance (0 critical, ≤5 minor issues)
- Export functionality (copy, download .tsx, save to library)
- 1-second error fallback with clear messaging

---

## Phase 1: Project Foundation & Setup ✅

### 1.1 Environment Setup

- [x] Next.js project initialized
- [ ] Environment variables setup (GEMINI_API_KEY, DATABASE_URL)
- [ ] Package dependencies installation
- [ ] TypeScript configuration optimization
- [ ] ESLint custom rules setup

### 1.2 Database Setup

- [ ] Prisma schema definition (Component model)
- [ ] Database migration setup
- [ ] Prisma client configuration
- [ ] Seed data for testing

---

## Phase 2: Core Architecture & Templates

### 2.1 Component Templates System

- [ ] Create base template structure
- [ ] MUITable template with DataGrid
- [ ] MUIButton template with variants
- [ ] MUIForm template with react-hook-form
- [ ] MUIDialog template with actions
- [ ] MUICard template with content slots
- [ ] MUITabs template with panels
- [ ] MUIList template with items
- [ ] Template injection system (placeholder replacement)

### 2.2 JSON Schema Definition

- [ ] Component output schema definition
- [ ] Props schema structure
- [ ] Validation schema with Ajv
- [ ] Error message mapping
- [ ] Schema versioning system

### 2.3 LLM Integration Layer

- [ ] Gemini API wrapper implementation
- [ ] Prompt template system
- [ ] Few-shot examples database
- [ ] JSON parsing with repair logic
- [ ] Retry mechanism (up to 2 attempts)
- [ ] Structured output enforcement

---

## Phase 3: Code Generation & Validation

### 3.1 Static Analysis & Safety

- [ ] TypeScript compilation service
- [ ] AST-based safety checks (ts-morph/babel)
- [ ] Forbidden pattern detection regex
- [ ] Import whitelist enforcement
- [ ] Quick safety pre-check (1-second fallback)
- [ ] Safe fallback code generation

### 3.2 Code Generation Pipeline

- [ ] Template-based code generation
- [ ] Props interface generation
- [ ] Import statement management
- [ ] Code formatting with Prettier
- [ ] Deterministic repair system

---

## Phase 4: Preview System & Sandboxing

### 4.1 Preview Infrastructure

- [ ] esbuild bundling service
- [ ] Iframe sandbox implementation
- [ ] CSP headers configuration
- [ ] PostMessage communication system
- [ ] Theme provider wrapper
- [ ] Error boundary implementation

### 4.2 Theme & Accessibility

- [ ] Light/dark theme toggle
- [ ] MUI theme provider integration
- [ ] axe-core integration for preview
- [ ] Accessibility report generation
- [ ] WCAG compliance checking
- [ ] Keyboard navigation testing

---

## Phase 5: API Routes Implementation

### 5.1 Core API Endpoints

- [ ] POST /api/generate - Main generation endpoint
- [ ] POST /api/validate - Code validation service
- [ ] GET/POST /api/preview - Preview bundling & serving
- [ ] POST /api/save - Component persistence
- [ ] GET /api/export - File download service
- [ ] GET /api/library - Component listing & search

### 5.2 Error Handling & Fallbacks

- [ ] Structured error responses
- [ ] Validation error mapping
- [ ] LLM failure handling
- [ ] Rate limiting implementation
- [ ] Request timeout handling

---

## Phase 6: Frontend UI Components

### 6.1 Main Interface

- [ ] Prompt input editor
- [ ] Component type suggestions
- [ ] Generated code viewer (Monaco)
- [ ] Preview iframe container
- [ ] Theme toggle controls
- [ ] Error panel component

### 6.2 Export & Library Features

- [ ] Code copy functionality
- [ ] Download .tsx implementation
- [ ] Save to library dialog
- [ ] Library browser interface
- [ ] Component search & filtering
- [ ] Metadata display

### 6.3 Accessibility & UX

- [ ] Keyboard navigation support
- [ ] Screen reader compatibility
- [ ] Focus management
- [ ] Loading states & feedback
- [ ] Error state handling
- [ ] Responsive design

---

## Phase 7: Testing & Quality Assurance

### 7.1 Unit Testing

- [ ] JSON parsing/validation tests
- [ ] AST safety check tests
- [ ] Template injection tests
- [ ] Component generation tests
- [ ] API route unit tests

### 7.2 Integration Testing

- [ ] End-to-end generation flow
- [ ] Preview rendering tests
- [ ] Theme switching tests
- [ ] Export functionality tests
- [ ] Database integration tests

### 7.3 Accessibility Testing

- [ ] axe-core automated testing
- [ ] Keyboard navigation e2e tests
- [ ] Screen reader compatibility
- [ ] WCAG compliance verification
- [ ] Cross-browser testing

### 7.4 Security Testing

- [ ] Forbidden pattern injection tests
- [ ] CSP bypass attempts
- [ ] Sandbox escape testing
- [ ] Input sanitization tests
- [ ] API security testing

---

## Phase 8: Performance & Optimization

### 8.1 Performance Optimization

- [ ] Bundle size optimization
- [ ] Preview load time optimization (<2s)
- [ ] LLM response caching
- [ ] Database query optimization
- [ ] Code splitting implementation

### 8.2 Monitoring & Observability

- [ ] Error tracking setup
- [ ] Performance metrics
- [ ] Usage analytics
- [ ] LLM usage monitoring
- [ ] Accessibility metrics tracking

---

## Phase 9: Documentation & Deployment

### 9.1 Documentation

- [ ] API documentation
- [ ] Component template docs
- [ ] Development setup guide
- [ ] Security guidelines
- [ ] Accessibility guidelines

### 9.2 Deployment Preparation

- [ ] Environment configuration
- [ ] Database migration scripts
- [ ] Security headers configuration
- [ ] Performance monitoring setup
- [ ] Error reporting setup

---

## Acceptance Criteria Checklist

### Core Functionality

- [ ] Plain-English prompts map to correct components (≥80% accuracy)
- [ ] Generated code compiles with TypeScript (0 errors)
- [ ] Only approved imports (@mui/material, @mui/x-data-grid, react-hook-form)
- [ ] Default export with strongly typed props (no `any`)

### Preview & Sandbox

- [ ] Iframe preview renders without breaking host
- [ ] Preview loads in <2 seconds (up to 400 lines)
- [ ] Light/dark theme toggle works
- [ ] Clear error panel on failures (no crashes)

### Accessibility

- [ ] WCAG 2.1 AA compliance for interactive components
- [ ] Full keyboard operability (Tab, Enter, Space, Escape)
- [ ] Correct ARIA roles and labels
- [ ] Visible focus states
- [ ] 0 critical axe-core issues, ≤5 minor issues

### Export & Safety

- [ ] Copy code, download .tsx, save to library
- [ ] Downloaded components compile out-of-the-box
- [ ] No dangerouslySetInnerHTML, window access, or unauthorized network calls
- [ ] CSP enforcement prevents script injection
- [ ] 1-second error fallback on invalid AI output

---

## Current Status: Phase 1 - Project Foundation

**Next Steps:** Environment setup and dependency installation

**Last Updated:** September 24, 2025
