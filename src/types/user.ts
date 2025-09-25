import { z } from 'zod';

// User Role Enum
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  DEVELOPER = 'DEVELOPER',
}

// User Schema
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().optional(),
  avatar: z.string().url().optional(),
  role: z.nativeEnum(UserRole).default(UserRole.USER),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastLoginAt: z.date().optional(),
});

export type User = z.infer<typeof UserSchema>;

// Session Schema
export const SessionSchema = z.object({
  id: z.string().uuid(),
  sessionToken: z.string(),
  userId: z.string().uuid(),
  expires: z.date(),
  user: UserSchema.optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Session = z.infer<typeof SessionSchema>;

// User Preferences
export const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.string().default('en'),
  timezone: z.string().default('UTC'),
  notifications: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(false),
    marketing: z.boolean().default(false),
  }).default({}),
  editor: z.object({
    fontSize: z.number().min(10).max(24).default(14),
    tabSize: z.number().min(2).max(8).default(2),
    wordWrap: z.boolean().default(true),
    minimap: z.boolean().default(true),
    lineNumbers: z.boolean().default(true),
  }).default({}),
  accessibility: z.object({
    highContrast: z.boolean().default(false),
    reducedMotion: z.boolean().default(false),
    screenReader: z.boolean().default(false),
  }).default({}),
});

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

// User Profile
export interface UserProfile extends User {
  preferences: UserPreferences;
  stats: {
    componentsCreated: number;
    componentsShared: number;
    totalGenerations: number;
    successfulGenerations: number;
    favoriteComponentTypes: string[];
    joinedAt: Date;
    lastActiveAt: Date;
  };
}

// Authentication
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role: UserRole;
}

export interface AuthSession {
  user: AuthUser;
  expires: string;
  accessToken?: string;
  refreshToken?: string;
}

// User Activity
export enum ActivityType {
  COMPONENT_GENERATED = 'COMPONENT_GENERATED',
  COMPONENT_SAVED = 'COMPONENT_SAVED',
  COMPONENT_SHARED = 'COMPONENT_SHARED',
  COMPONENT_DOWNLOADED = 'COMPONENT_DOWNLOADED',
  LIBRARY_BROWSED = 'LIBRARY_BROWSED',
  PROFILE_UPDATED = 'PROFILE_UPDATED',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
}

export interface UserActivity {
  id: string;
  userId: string;
  type: ActivityType;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// User Permissions
export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
}

export interface RolePermission {
  role: UserRole;
  permissions: Permission[];
}

// User API Types
export namespace UserAPI {
  export const CreateUserRequest = z.object({
    email: z.string().email(),
    name: z.string().optional(),
    password: z.string().min(8).optional(),
    role: z.nativeEnum(UserRole).default(UserRole.USER),
  });

  export type CreateUserRequest = z.infer<typeof CreateUserRequest>;

  export const UpdateUserRequest = z.object({
    name: z.string().optional(),
    avatar: z.string().url().optional(),
    preferences: UserPreferencesSchema.partial().optional(),
  });

  export type UpdateUserRequest = z.infer<typeof UpdateUserRequest>;

  export const ChangePasswordRequest = z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(8),
    confirmPassword: z.string(),
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

  export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequest>;

  export const LoginRequest = z.object({
    email: z.string().email(),
    password: z.string(),
    rememberMe: z.boolean().default(false),
  });

  export type LoginRequest = z.infer<typeof LoginRequest>;

  export const RegisterRequest = z.object({
    email: z.string().email(),
    name: z.string().min(1),
    password: z.string().min(8),
    confirmPassword: z.string(),
    terms: z.boolean().refine(val => val === true, {
      message: "You must accept the terms and conditions",
    }),
  }).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

  export type RegisterRequest = z.infer<typeof RegisterRequest>;

  export const ForgotPasswordRequest = z.object({
    email: z.string().email(),
  });

  export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequest>;

  export const ResetPasswordRequest = z.object({
    token: z.string(),
    password: z.string().min(8),
    confirmPassword: z.string(),
  }).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

  export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequest>;
}

// User Subscription (if implementing paid features)
export enum SubscriptionTier {
  FREE = 'FREE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export interface UserSubscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: 'active' | 'canceled' | 'expired' | 'past_due';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  limits: {
    monthlyGenerations: number;
    savedComponents: number;
    teamMembers: number;
    apiCalls: number;
  };
  usage: {
    generationsUsed: number;
    savedComponentsUsed: number;
    apiCallsUsed: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
