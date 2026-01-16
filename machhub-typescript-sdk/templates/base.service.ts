import { getOrInitializeSDK } from './sdk.service';

/**
 * Filter options for queries
 */
export interface FilterOption {
  column: string;
  operator: '=' | '>' | '<' | '<=' | '>=' | '!=' | 'CONTAINS' | 'IN';
  value: any;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  pageIndex: number;
  pageSize: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  filters?: FilterOption[];
}

/**
 * Base Service with standardized pagination and filtering
 * Extend this class for all your domain-specific services
 */
export class BaseService {
  /**
   * Get all records from a collection
   */
  protected async getAllRecords<T>(collectionName: string): Promise<T[]> {
    const sdk = await getOrInitializeSDK();
    return sdk.collection(collectionName).getAll() as Promise<T[]>;
  }

  /**
   * Get paginated records from a collection with sorting and filtering
   */
  protected async getPaginatedRecords<T>(
    collectionName: string,
    options: PaginationOptions
  ): Promise<T[]> {
    const sdk = await getOrInitializeSDK();
    let collection = sdk.collection(collectionName);

    // Apply filters
    if (options.filters && options.filters.length > 0) {
      for (const filter of options.filters) {
        collection = collection.filter(filter.column, filter.operator, filter.value);
      }
    }

    // Apply sorting
    const sortField = options.sortField || 'id';
    const sortDirection = options.sortDirection || 'asc';
    collection = collection.sort(sortField, sortDirection);

    // Apply pagination
    const offset = options.pageIndex * options.pageSize;
    const results = await collection
      .offset(offset)
      .limit(options.pageSize)
      .getAll();

    return results as T[];
  }

  /**
   * Get total count of records (with optional filters)
   */
  protected async getTotalRecordsCount(
    collectionName: string,
    filters?: FilterOption[]
  ): Promise<number> {
    const sdk = await getOrInitializeSDK();
    let collection = sdk.collection(collectionName);

    // Apply filters if provided
    if (filters && filters.length > 0) {
      for (const filter of filters) {
        collection = collection.filter(filter.column, filter.operator, filter.value);
      }
    }

    return collection.count();
  }

  /**
   * Get a single record by ID
   */
  protected async getRecordById<T>(
    collectionName: string,
    recordId: string
  ): Promise<T | null> {
    const sdk = await getOrInitializeSDK();
    const result = await sdk.collection(collectionName).getById(recordId);
    return result as T | null;
  }

  /**
   * Create a new record
   * @param collectionName - Name of the collection
   * @param data - Partial data to create
   * 
   * Note: For reference/linked fields, use the format:
   * {
   *   Table: "application_id.collection_name",
   *   ID: "record_id"
   * }
   */
  protected async createRecord<T>(
    collectionName: string,
    data: Partial<T>
  ): Promise<T> {
    const sdk = await getOrInitializeSDK();
    const result = await sdk.collection(collectionName).create(data);
    return result as T;
  }

  /**
   * Update a record
   * @param collectionName - Name of the collection
   * @param recordId - Record ID (e.g., "SUP-001" or full reference "app.collection:id")
   * @param data - Partial data to update
   * 
   * Note: For reference/linked fields, use the format:
   * {
   *   Table: "application_id.collection_name",
   *   ID: "record_id"
   * }
   */
  protected async updateRecord<T>(
    collectionName: string,
    recordId: string,
    data: Partial<T>
  ): Promise<T> {
    const sdk = await getOrInitializeSDK();
    const result = await sdk.collection(collectionName).update(recordId, data);
    return result as T;
  }

  /**
   * Delete a record
   */
  protected async deleteRecord(
    collectionName: string,
    recordId: string
  ): Promise<void> {
    const sdk = await getOrInitializeSDK();
    await sdk.collection(collectionName).delete(recordId);
  }
}

/**
 * Helper function to extract ID from reference field values
 * 
 * @param value - The reference field value (can be object or string)
 * @returns The extracted ID
 * 
 * @example
 * ```typescript
 * // Input: { ID: "app.categories:CAT-001" }
 * // Output: "CAT-001"
 * 
 * // Input: "app.categories:CAT-001"
 * // Output: "CAT-001"
 * ```
 */
export function extractId(value: any): string {
  // Handle nested object: { ID: "app.collection:id" }
  if (typeof value === 'object' && value?.ID) {
    value = value.ID;
  }

  // Handle string reference: "app.collection:id"
  if (typeof value === 'string' && value.includes(':')) {
    return value.split(':')[1];
  }

  return value;
}
