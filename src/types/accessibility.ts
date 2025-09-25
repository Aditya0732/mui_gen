import { z } from 'zod';

// axe-core result types
export interface AxeResult {
  violations: AxeViolation[];
  passes: AxePass[];
  incomplete: AxeIncomplete[];
  inapplicable: AxeInapplicable[];
  timestamp: string;
  url: string;
}

export interface AxeViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  tags: string[];
  description: string;
  help: string;
  helpUrl: string;
  nodes: AxeNode[];
}

export interface AxePass {
  id: string;
  impact: null;
  tags: string[];
  description: string;
  help: string;
  helpUrl: string;
  nodes: AxeNode[];
}

export interface AxeIncomplete {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  tags: string[];
  description: string;
  help: string;
  helpUrl: string;
  nodes: AxeNode[];
}

export interface AxeInapplicable {
  id: string;
  impact: null;
  tags: string[];
  description: string;
  help: string;
  helpUrl: string;
}

export interface AxeNode {
  any: AxeCheck[];
  all: AxeCheck[];
  none: AxeCheck[];
  impact: 'minor' | 'moderate' | 'serious' | 'critical' | null;
  html: string;
  target: string[];
  failureSummary?: string;
}

export interface AxeCheck {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  message: string;
  data: any;
  relatedNodes: AxeRelatedNode[];
}

export interface AxeRelatedNode {
  target: string[];
  html: string;
}

// Accessibility Report
export const AccessibilityReport = z.object({
  id: z.string(),
  componentId: z.string(),
  score: z.number().min(0).max(100),
  violations: z.array(z.object({
    id: z.string(),
    impact: z.enum(['minor', 'moderate', 'serious', 'critical']),
    description: z.string(),
    help: z.string(),
    helpUrl: z.string(),
    nodes: z.array(z.object({
      html: z.string(),
      target: z.array(z.string()),
      failureSummary: z.string().optional(),
    })),
  })),
  passes: z.array(z.object({
    id: z.string(),
    description: z.string(),
    help: z.string(),
  })),
  incomplete: z.array(z.object({
    id: z.string(),
    impact: z.enum(['minor', 'moderate', 'serious', 'critical']),
    description: z.string(),
    help: z.string(),
    nodes: z.array(z.object({
      html: z.string(),
      target: z.array(z.string()),
    })),
  })),
  summary: z.object({
    totalRules: z.number(),
    passedRules: z.number(),
    violatedRules: z.number(),
    incompleteRules: z.number(),
    criticalIssues: z.number(),
    seriousIssues: z.number(),
    moderateIssues: z.number(),
    minorIssues: z.number(),
  }),
  createdAt: z.string().datetime(),
});

export type AccessibilityReport = z.infer<typeof AccessibilityReport>;

// WCAG Guidelines
export enum WCAGLevel {
  A = 'A',
  AA = 'AA',
  AAA = 'AAA',
}

export enum WCAGPrinciple {
  PERCEIVABLE = 'perceivable',
  OPERABLE = 'operable',
  UNDERSTANDABLE = 'understandable',
  ROBUST = 'robust',
}

export interface WCAGGuideline {
  id: string;
  principle: WCAGPrinciple;
  level: WCAGLevel;
  title: string;
  description: string;
  successCriteria: WCAGSuccessCriterion[];
}

export interface WCAGSuccessCriterion {
  id: string;
  level: WCAGLevel;
  title: string;
  description: string;
  techniques: string[];
  failures: string[];
}

// Accessibility Testing Configuration
export interface AccessibilityTestConfig {
  rules: {
    [ruleId: string]: {
      enabled: boolean;
      tags?: string[];
    };
  };
  tags: string[];
  level: WCAGLevel;
  reporter: 'v1' | 'v2' | 'raw';
  resultTypes: Array<'violations' | 'incomplete' | 'passes' | 'inapplicable'>;
}

// Keyboard Navigation Testing
export interface KeyboardTestResult {
  componentId: string;
  tests: KeyboardTest[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    score: number;
  };
  createdAt: string;
}

export interface KeyboardTest {
  name: string;
  description: string;
  keys: string[];
  expectedBehavior: string;
  actualBehavior: string;
  passed: boolean;
  error?: string;
}

// Screen Reader Testing
export interface ScreenReaderTestResult {
  componentId: string;
  screenReader: 'NVDA' | 'JAWS' | 'VoiceOver' | 'TalkBack';
  tests: ScreenReaderTest[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    score: number;
  };
  createdAt: string;
}

export interface ScreenReaderTest {
  name: string;
  description: string;
  expectedAnnouncement: string;
  actualAnnouncement: string;
  passed: boolean;
  context?: string;
}

// Color Contrast Analysis
export interface ColorContrastResult {
  foreground: string;
  background: string;
  ratio: number;
  level: 'AA' | 'AAA' | 'fail';
  size: 'normal' | 'large';
  passed: boolean;
}

// Accessibility Recommendations
export interface AccessibilityRecommendation {
  id: string;
  type: 'error' | 'warning' | 'suggestion';
  category: 'keyboard' | 'screen-reader' | 'color' | 'structure' | 'content';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  effort: 'low' | 'medium' | 'high';
  wcagReference: string[];
  codeExample?: string;
  resources: string[];
}

// Accessibility Audit Summary
export interface AccessibilityAuditSummary {
  componentId: string;
  overallScore: number;
  level: WCAGLevel;
  compliance: {
    [WCAGLevel.A]: boolean;
    [WCAGLevel.AA]: boolean;
    [WCAGLevel.AAA]: boolean;
  };
  categories: {
    [key in WCAGPrinciple]: {
      score: number;
      issues: number;
      recommendations: number;
    };
  };
  recommendations: AccessibilityRecommendation[];
  testResults: {
    axe: AccessibilityReport;
    keyboard?: KeyboardTestResult;
    screenReader?: ScreenReaderTestResult[];
    colorContrast?: ColorContrastResult[];
  };
  createdAt: string;
  updatedAt: string;
}
