import { UserRole, UserPreferences } from '@/types';

export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public name?: string,
    public avatar?: string,
    public readonly role: UserRole = UserRole.USER,
    public preferences: UserPreferences = {
      theme: 'system',
      language: 'en',
      timezone: 'UTC',
      notifications: {
        email: true,
        push: false,
        marketing: false,
      },
      editor: {
        fontSize: 14,
        tabSize: 2,
        wordWrap: true,
        minimap: true,
        lineNumbers: true,
      },
      accessibility: {
        highContrast: false,
        reducedMotion: false,
        screenReader: false,
      },
    },
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public lastLoginAt?: Date
  ) {
    this.validateEmail(email);
    this.validateRole(role);
  }

  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
  }

  private validateRole(role: UserRole): void {
    if (!Object.values(UserRole).includes(role)) {
      throw new Error('Invalid user role');
    }
  }

  public updateProfile(updates: {
    name?: string;
    avatar?: string;
  }): void {
    if (updates.name !== undefined) {
      this.name = updates.name;
    }
    if (updates.avatar !== undefined) {
      this.avatar = updates.avatar;
    }
    this.updatedAt = new Date();
  }

  public updatePreferences(preferences: Partial<UserPreferences>): void {
    this.preferences = {
      ...this.preferences,
      ...preferences,
      notifications: {
        ...this.preferences.notifications,
        ...preferences.notifications,
      },
      editor: {
        ...this.preferences.editor,
        ...preferences.editor,
      },
      accessibility: {
        ...this.preferences.accessibility,
        ...preferences.accessibility,
      },
    };
    this.updatedAt = new Date();
  }

  public recordLogin(): void {
    this.lastLoginAt = new Date();
  }

  public isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  public isDeveloper(): boolean {
    return this.role === UserRole.DEVELOPER;
  }

  public canCreateComponents(): boolean {
    return true; // All users can create components
  }

  public canManageUsers(): boolean {
    return this.role === UserRole.ADMIN;
  }

  public canAccessDeveloperFeatures(): boolean {
    return this.role === UserRole.DEVELOPER || this.role === UserRole.ADMIN;
  }

  public getDisplayName(): string {
    return this.name || this.email.split('@')[0] || 'User';
  }

  public getInitials(): string {
    if (this.name) {
      return this.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return this.email[0].toUpperCase();
  }

  public getTheme(): 'light' | 'dark' | 'system' {
    return this.preferences.theme;
  }

  public getLanguage(): string {
    return this.preferences.language;
  }

  public getTimezone(): string {
    return this.preferences.timezone;
  }

  public hasNotificationEnabled(type: 'email' | 'push' | 'marketing'): boolean {
    return this.preferences.notifications[type];
  }

  public getEditorSettings(): UserPreferences['editor'] {
    return this.preferences.editor;
  }

  public getAccessibilitySettings(): UserPreferences['accessibility'] {
    return this.preferences.accessibility;
  }

  public isActive(): boolean {
    if (!this.lastLoginAt) return false;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return this.lastLoginAt > thirtyDaysAgo;
  }

  public getDaysSinceLastLogin(): number | null {
    if (!this.lastLoginAt) return null;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.lastLoginAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      avatar: this.avatar,
      role: this.role,
      preferences: this.preferences,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      lastLoginAt: this.lastLoginAt?.toISOString(),
    };
  }

  public toPublicJSON(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      avatar: this.avatar,
      role: this.role,
      createdAt: this.createdAt.toISOString(),
    };
  }

  public static fromJSON(data: any): User {
    return new User(
      data.id,
      data.email,
      data.name,
      data.avatar,
      data.role || UserRole.USER,
      data.preferences || {},
      new Date(data.createdAt),
      new Date(data.updatedAt),
      data.lastLoginAt ? new Date(data.lastLoginAt) : undefined
    );
  }
}
