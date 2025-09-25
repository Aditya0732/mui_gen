import { User } from '../entities/User';
import { UserRole } from '@/types';

export interface IUserRepository {
  // Basic CRUD operations
  create(user: User): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  update(user: User): Promise<User>;
  delete(id: string): Promise<void>;

  // Query operations
  findAll(options?: {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    users: User[];
    total: number;
  }>;

  findByRole(
    role: UserRole,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    users: User[];
    total: number;
  }>;

  search(
    query: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    users: User[];
    total: number;
  }>;

  // Authentication related
  findByEmailForAuth(email: string): Promise<User | null>;
  updateLastLogin(id: string): Promise<void>;

  // Statistics
  getTotalCount(): Promise<number>;
  getActiveUsersCount(days?: number): Promise<number>;
  getNewUsersCount(days?: number): Promise<number>;
  
  getUserStats(userId: string): Promise<{
    componentsCreated: number;
    componentsShared: number;
    totalGenerations: number;
    successfulGenerations: number;
    joinedAt: Date;
    lastActiveAt?: Date;
  } | null>;

  getCountByRole(): Promise<Array<{
    role: UserRole;
    count: number;
  }>>;

  // Activity tracking
  getRecentlyActive(limit?: number): Promise<User[]>;
  getInactiveUsers(days: number, limit?: number): Promise<User[]>;

  // Validation
  existsByEmail(email: string, excludeId?: string): Promise<boolean>;
  
  // Bulk operations
  createMany(users: User[]): Promise<User[]>;
  deleteMany(ids: string[]): Promise<void>;
  updateRole(ids: string[], role: UserRole): Promise<void>;

  // Preferences
  updatePreferences(id: string, preferences: any): Promise<void>;
  getPreferences(id: string): Promise<any | null>;
}
