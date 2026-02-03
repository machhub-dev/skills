// filepath: src/utils/query-builder.ts
import type { SDK } from '@machhub-dev/sdk-ts';

export type FilterOperator = 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'nin' | 'contains';

export interface QueryFilter {
    field: string;
    operator: FilterOperator;
    value: any;
    or?: boolean;
}

export interface QueryOptions {
    filters?: QueryFilter[];
    sort?: {
        field: string;
        direction: 'asc' | 'desc';
    };
    pagination?: {
        page: number;
        limit: number;
    };
    fields?: string[];
    expand?: string[];
}

export class QueryBuilder {
    /**
     * Build a query from options
     */
    static build(sdk: SDK, collectionName: string, options?: QueryOptions) {
        let query = sdk.collection(collectionName);

        // Apply filters
        if (options?.filters) {
            for (const filter of options.filters) {
                if (filter.or) {
                    query = query.or();
                }
                query = query.filter(filter.field, filter.operator, filter.value);
            }
        }

        // Apply sorting
        if (options?.sort) {
            query = query.sort(options.sort.field, options.sort.direction);
        }

        // Apply pagination
        if (options?.pagination) {
            const { page, limit } = options.pagination;
            const skip = (page - 1) * limit;
            query = query.skip(skip).limit(limit);
        }

        // Apply field selection
        if (options?.fields) {
            query = query.fields(options.fields);
        }

        // Apply expand
        if (options?.expand) {
            query = query.expand(options.expand);
        }

        return query;
    }

    /**
     * Create a date range filter
     */
    static dateRange(field: string, start: Date, end: Date): QueryFilter[] {
        return [
            { field, operator: 'gte', value: start.toISOString() },
            { field, operator: 'lte', value: end.toISOString() }
        ];
    }

    /**
     * Create a search filter (OR conditions)
     */
    static search(fields: string[], query: string): QueryFilter[] {
        return fields.map((field, index) => ({
            field,
            operator: 'contains' as FilterOperator,
            value: query,
            or: index > 0
        }));
    }

    /**
     * Create an IN filter for multiple values
     */
    static inValues(field: string, values: any[]): QueryFilter {
        return {
            field,
            operator: 'in',
            value: values
        };
    }
}
