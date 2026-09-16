// filepath: src/services/base.service.ts
import { getOrInitializeSDK } from './sdk.service';
import type { SDK } from '@machhub-dev/sdk-ts';

export interface PaginationOptions {
    page?: number;
    limit?: number;
}

export interface FilterOptions {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'nin' | 'contains';
    value: any;
}

export interface SortOptions {
    field: string;
    direction: 'asc' | 'desc';
}

export abstract class BaseService {
    protected async getSDK(): Promise<SDK> {
        return await getOrInitializeSDK();
    }

    protected async getAllRecords<T>(
        collectionName: string,
        options?: {
            pagination?: PaginationOptions;
            filters?: FilterOptions[];
            sort?: SortOptions;
            fields?: string[];
        }
    ): Promise<T[]> {
        try {
            const sdk = await this.getSDK();
            let query = sdk.collection(collectionName);

            // Apply filters
            if (options?.filters) {
                for (const filter of options.filters) {
                    query = query.filter(filter.field, filter.operator, filter.value);
                }
            }

            // Apply sorting
            if (options?.sort) {
                query = query.sort(options.sort.field, options.sort.direction);
            }

            // Apply pagination
            if (options?.pagination) {
                const { page = 1, limit = 100 } = options.pagination;
                query = query.skip((page - 1) * limit).limit(limit);
            }

            // Apply field selection
            if (options?.fields) {
                query = query.fields(options.fields);
            }

            return await query.getAll();
        } catch (error) {
            console.error(`Error fetching ${collectionName}:`, error);
            throw error;
        }
    }

    protected async getRecordById<T>(
        collectionName: string,
        id: string,
        options?: { expand?: string[]; fields?: string[]; }
    ): Promise<T | null> {
        try {
            const sdk = await this.getSDK();
            const fullId = `myapp.${collectionName}:${id}`;
            let query = sdk.collection(collectionName);

            // Apply expand
            if (options?.expand) {
                query = query.expand(options.expand);
            }

            // Apply field selection
            if (options?.fields) {
                query = query.fields(options.fields);
            }

            return await query.getOne(fullId);
        } catch (error) {
            console.error(`Error fetching ${collectionName} ${id}:`, error);
            return null;
        }
    }

    protected async createRecord<T>(
        collectionName: string,
        data: Partial<T>
    ): Promise<T> {
        try {
            const sdk = await this.getSDK();
            return await sdk.collection(collectionName).create(data);
        } catch (error) {
            console.error(`Error creating ${collectionName}:`, error);
            throw error;
        }
    }

    protected async updateRecord<T>(
        collectionName: string,
        id: string,
        updates: Partial<T>
    ): Promise<T> {
        try {
            const sdk = await this.getSDK();
            const fullId = `myapp.${collectionName}:${id}`;
            return await sdk.collection(collectionName).update(fullId, updates);
        } catch (error) {
            console.error(`Error updating ${collectionName} ${id}:`, error);
            throw error;
        }
    }

    protected async deleteRecord(
        collectionName: string,
        id: string
    ): Promise<void> {
        try {
            const sdk = await this.getSDK();
            const fullId = `myapp.${collectionName}:${id}`;
            await sdk.collection(collectionName).delete(fullId);
        } catch (error) {
            console.error(`Error deleting ${collectionName} ${id}:`, error);
            throw error;
        }
    }

    protected extractId(value: any): string {
        if (typeof value === 'object' && value?.ID) {
            return value.ID;
        }
        if (typeof value === 'string' && value.includes(':')) {
            return value.split(':')[1];
        }
        return value;
    }
}
