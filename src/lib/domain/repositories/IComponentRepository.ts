import { Component } from '../entities/Component';
import { ComponentType, ComponentSearchOptions } from '@/types';

export interface IComponentRepository {
  // Basic CRUD operations
  create(component: Component): Promise<Component>;
  findById(id: string): Promise<Component | null>;
  findByName(name: string): Promise<Component | null>;
  update(component: Component): Promise<Component>;
  delete(id: string): Promise<void>;

  // Query operations
  findAll(options?: {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    components: Component[];
    total: number;
  }>;

  findByType(
    type: ComponentType,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    components: Component[];
    total: number;
  }>;

  findByOwner(
    ownerId: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    components: Component[];
    total: number;
  }>;

  findByTags(
    tags: string[],
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    components: Component[];
    total: number;
  }>;

  search(searchOptions: ComponentSearchOptions): Promise<{
    components: Component[];
    total: number;
  }>;

  // Statistics and analytics
  getMostUsed(limit?: number): Promise<Component[]>;
  getRecentlyCreated(limit?: number): Promise<Component[]>;
  getRecentlyUsed(limit?: number): Promise<Component[]>;
  
  getCountByType(): Promise<Array<{
    type: ComponentType;
    count: number;
  }>>;

  getTotalCount(): Promise<number>;
  
  getUsageStats(componentId: string): Promise<{
    totalUsage: number;
    lastUsed?: Date;
    averageRating?: number;
  } | null>;

  // Bulk operations
  createMany(components: Component[]): Promise<Component[]>;
  deleteMany(ids: string[]): Promise<void>;
  
  // Validation
  existsByName(name: string, excludeId?: string): Promise<boolean>;
  
  // Metadata operations
  updateUsageCount(id: string): Promise<void>;
  updateLastUsed(id: string): Promise<void>;
  
  // Export/Import
  exportComponents(ids: string[]): Promise<Component[]>;
  importComponents(components: Component[]): Promise<Component[]>;
}
