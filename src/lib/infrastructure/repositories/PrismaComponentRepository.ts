import { PrismaClient } from '@prisma/client';
import { Component } from '../../domain/entities/Component';
import { IComponentRepository } from '../../domain/repositories/IComponentRepository';
import { ComponentType, ComponentSearchOptions } from '@/types';

export class PrismaComponentRepository implements IComponentRepository {
  constructor(private prisma: PrismaClient) {}

  async create(component: Component): Promise<Component> {
    const data = await this.prisma.component.create({
      data: {
        id: component.id,
        name: component.name,
        type: component.type as any,
        code: component.code,
        propsSchema: component.propsSchema as any,
        description: component.description,
        examples: component.examples?.join('\n---\n'),
        tags: component.tags,
        metadata: component.metadata as any,
        version: component.version,
        ownerId: component.ownerId,
        usageCount: component.usageCount,
        lastUsedAt: component.lastUsedAt,
      },
    });

    return this.mapToEntity(data);
  }

  async findById(id: string): Promise<Component | null> {
    const data = await this.prisma.component.findUnique({
      where: { id },
    });

    return data ? this.mapToEntity(data) : null;
  }

  async findByName(name: string): Promise<Component | null> {
    const data = await this.prisma.component.findUnique({
      where: { name },
    });

    return data ? this.mapToEntity(data) : null;
  }

  async update(component: Component): Promise<Component> {
    const data = await this.prisma.component.update({
      where: { id: component.id },
      data: {
        name: component.name,
        code: component.code,
        propsSchema: component.propsSchema as any,
        description: component.description,
        examples: component.examples?.join('\n---\n'),
        tags: component.tags,
        metadata: component.metadata as any,
        version: component.version,
        usageCount: component.usageCount,
        lastUsedAt: component.lastUsedAt,
        updatedAt: new Date(),
      },
    });

    return this.mapToEntity(data);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.component.delete({
      where: { id },
    });
  }

  async findAll(options?: {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    components: Component[];
    total: number;
  }> {
    const { limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = options || {};

    const [data, total] = await Promise.all([
      this.prisma.component.findMany({
        take: limit,
        skip: offset,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.component.count(),
    ]);

    return {
      components: data.map(this.mapToEntity),
      total,
    };
  }

  async findByType(
    type: ComponentType,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    components: Component[];
    total: number;
  }> {
    const { limit = 20, offset = 0 } = options || {};

    const [data, total] = await Promise.all([
      this.prisma.component.findMany({
        where: { type: type as any },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.component.count({
        where: { type: type as any },
      }),
    ]);

    return {
      components: data.map(this.mapToEntity),
      total,
    };
  }

  async findByOwner(
    ownerId: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    components: Component[];
    total: number;
  }> {
    const { limit = 20, offset = 0 } = options || {};

    const [data, total] = await Promise.all([
      this.prisma.component.findMany({
        where: { ownerId },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.component.count({
        where: { ownerId },
      }),
    ]);

    return {
      components: data.map(this.mapToEntity),
      total,
    };
  }

  async findByTags(
    tags: string[],
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    components: Component[];
    total: number;
  }> {
    const { limit = 20, offset = 0 } = options || {};

    const [data, total] = await Promise.all([
      this.prisma.component.findMany({
        where: {
          tags: {
            hasSome: tags,
          },
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.component.count({
        where: {
          tags: {
            hasSome: tags,
          },
        },
      }),
    ]);

    return {
      components: data.map(this.mapToEntity),
      total,
    };
  }

  async search(searchOptions: ComponentSearchOptions): Promise<{
    components: Component[];
    total: number;
  }> {
    const {
      query,
      types,
      tags,
      complexity,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      limit = 20,
      offset = 0,
    } = searchOptions;

    const where: any = {};

    // Text search
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { tags: { hasSome: [query] } },
      ];
    }

    // Filter by types
    if (types && types.length > 0) {
      where.type = { in: types };
    }

    // Filter by tags
    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    // Filter by complexity (stored in metadata)
    if (complexity && complexity.length > 0) {
      where.metadata = {
        path: ['complexity'],
        in: complexity,
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.component.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.component.count({ where }),
    ]);

    return {
      components: data.map(this.mapToEntity),
      total,
    };
  }

  async getMostUsed(limit: number = 10): Promise<Component[]> {
    const data = await this.prisma.component.findMany({
      take: limit,
      orderBy: { usageCount: 'desc' },
    });

    return data.map(this.mapToEntity);
  }

  async getRecentlyCreated(limit: number = 10): Promise<Component[]> {
    const data = await this.prisma.component.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return data.map(this.mapToEntity);
  }

  async getRecentlyUsed(limit: number = 10): Promise<Component[]> {
    const data = await this.prisma.component.findMany({
      where: {
        lastUsedAt: { not: null },
      },
      take: limit,
      orderBy: { lastUsedAt: 'desc' },
    });

    return data.map(this.mapToEntity);
  }

  async getCountByType(): Promise<Array<{
    type: ComponentType;
    count: number;
  }>> {
    const data = await this.prisma.component.groupBy({
      by: ['type'],
      _count: { type: true },
    });

    return data.map(item => ({
      type: item.type as ComponentType,
      count: item._count.type,
    }));
  }

  async getTotalCount(): Promise<number> {
    return this.prisma.component.count();
  }

  async getUsageStats(componentId: string): Promise<{
    totalUsage: number;
    lastUsed?: Date;
    averageRating?: number;
  } | null> {
    const component = await this.prisma.component.findUnique({
      where: { id: componentId },
      select: {
        usageCount: true,
        lastUsedAt: true,
      },
    });

    if (!component) return null;

    return {
      totalUsage: component.usageCount,
      lastUsed: component.lastUsedAt || undefined,
      averageRating: undefined, // TODO: Implement rating system
    };
  }

  async createMany(components: Component[]): Promise<Component[]> {
    const data = await this.prisma.component.createMany({
      data: components.map(component => ({
        id: component.id,
        name: component.name,
        type: component.type as any,
        code: component.code,
        propsSchema: component.propsSchema as any,
        description: component.description,
        examples: component.examples?.join('\n---\n'),
        tags: component.tags,
        metadata: component.metadata as any,
        version: component.version,
        ownerId: component.ownerId,
        usageCount: component.usageCount,
        lastUsedAt: component.lastUsedAt,
      })),
    });

    // Return created components
    const created = await this.prisma.component.findMany({
      where: {
        id: { in: components.map(c => c.id) },
      },
    });

    return created.map(this.mapToEntity);
  }

  async deleteMany(ids: string[]): Promise<void> {
    await this.prisma.component.deleteMany({
      where: { id: { in: ids } },
    });
  }

  async existsByName(name: string, excludeId?: string): Promise<boolean> {
    const where: any = { name };
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await this.prisma.component.count({ where });
    return count > 0;
  }

  async updateUsageCount(id: string): Promise<void> {
    await this.prisma.component.update({
      where: { id },
      data: {
        usageCount: { increment: 1 },
      },
    });
  }

  async updateLastUsed(id: string): Promise<void> {
    await this.prisma.component.update({
      where: { id },
      data: {
        lastUsedAt: new Date(),
      },
    });
  }

  async exportComponents(ids: string[]): Promise<Component[]> {
    const data = await this.prisma.component.findMany({
      where: { id: { in: ids } },
    });

    return data.map(this.mapToEntity);
  }

  async importComponents(components: Component[]): Promise<Component[]> {
    return this.createMany(components);
  }

  private mapToEntity = (data: any): Component => {
    return new Component(
      data.id,
      data.name,
      data.type,
      data.code,
      data.propsSchema,
      data.description,
      data.examples ? data.examples.split('\n---\n') : undefined,
      data.tags || [],
      data.metadata,
      data.version,
      data.ownerId,
      data.createdAt,
      data.updatedAt,
      data.usageCount,
      data.lastUsedAt
    );
  };
}
