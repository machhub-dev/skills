---
name: machhub-typescript-sdk
description: Write production-ready code for Machhub SDK following singleton pattern, service architecture, and proper reference field handling for collections, authentication, tags, and historian.
---

## Overview

This Skill helps you write production-ready code for interfacing with Machhub's TypeScript SDK (`@machhub-dev/sdk-ts`). It enforces best practices including singleton pattern, service layer architecture, and proper handling of reference fields.

Use this Skill when working with:
- Machhub SDK initialization and configuration
- Collection CRUD operations (create, read, update, delete)
- Authentication and user management
- Real-time tag subscriptions
- Historical data queries
- Remote function invocation
- Workflow execution

## Package Information

- **Package Name**: `@machhub-dev/sdk-ts`
- **Purpose**: Official TypeScript/JavaScript SDK for interfacing with MACHHUB API
- **Installation**: `npm install @machhub-dev/sdk-ts`

## Core Principles

### 1. Singleton Service Pattern (CRITICAL)

The SDK must be initialized ONCE and reused throughout the application. Never create multiple instances.

**Complete Implementation:**

```typescript
// services/sdk.service.ts
import { SDK, type SDKConfig } from '@machhub-dev/sdk-ts';
import { browser } from '$app/environment'; // or your framework's equivalent

/**
 * Singleton SDK Service for managing the MACHHUB SDK instance
 * This service ensures a single SDK instance is used throughout the application
 */
class SDKService {
  private static instance: SDKService | null = null;
  private sdk: SDK | null = null;
  private isInitialized = false;
  private initPromise: Promise<boolean> | null = null;

  private constructor() {
    this.sdk = new SDK();
  }

  /**
   * Gets the singleton instance of SDKService
   */
  public static getInstance(): SDKService {
    if (!SDKService.instance) {
      SDKService.instance = new SDKService();
    }
    return SDKService.instance;
  }

  /**
   * Initializes the SDK with the provided configuration
   * This method is safe to call multiple times - it will only initialize once
   * 
   * @param config - SDK configuration options
   * @returns Promise<boolean> - true if initialized successfully
   */
  public async initialize(config?: SDKConfig): Promise<boolean> {
    // Only initialize in browser environment (skip for SSR)
    if (!browser) {
      console.warn('SDK can only be initialized in browser environment');
      return false;
    }

    // If already initialized, return true
    if (this.isInitialized) {
      return true;
    }

    // If initialization is in progress, wait for it
    if (this.initPromise) {
      return this.initPromise;
    }

    // Start initialization
    this.initPromise = (async () => {
      try {
        if (!this.sdk) {
          this.sdk = new SDK();
        }

        const success = await this.sdk.Initialize(config);
        this.isInitialized = success;

        if (success) {
          console.log('MACHHUB SDK initialized successfully');
        } else {
          console.error('MACHHUB SDK initialization failed');
        }

        return success;
      } catch (error) {
        console.error('Error initializing MACHHUB SDK:', error);
        this.isInitialized = false;
        return false;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  /**
   * Gets the SDK instance
   * Throws an error if SDK is not initialized
   */
  public getSDK(): SDK {
    if (!this.isInitialized || !this.sdk) {
      throw new Error(
        'SDK is not initialized. Call SDKService.getInstance().initialize() first.'
      );
    }
    return this.sdk;
  }

  /**
   * Gets the SDK instance, initializing it first if needed
   * This is the recommended method to use in components
   * 
   * @param config - SDK configuration options (used only if SDK is not initialized)
   * @returns Promise<SDK> - The initialized SDK instance
   */
  public async getOrInitializeSDK(config?: SDKConfig): Promise<SDK> {
    if (!this.isInitialized) {
      const success = await this.initialize(config);
      if (!success) {
        throw new Error('Failed to initialize SDK');
      }
    } 
    return this.getSDK();
  }

  /**
   * Checks if SDK is initialized
   */
  public get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Resets the SDK instance (useful for testing or re-initialization)
   */
  public reset(): void {
    this.sdk = null;
    this.isInitialized = false;
    this.initPromise = null;
  }
}

// Export singleton instance
export const sdkService = SDKService.getInstance();

/**
 * Smart helper function to get SDK - initializes automatically if needed
 * This is the recommended method to use in components and services
 * 
 * @param config - SDK configuration options (used only if SDK is not initialized)
 * @returns Promise<SDK> - The initialized SDK instance
 * 
 * @example
 * ```typescript
 * const sdk = await getOrInitializeSDK();
 * const items = await sdk.collection('items').find({});
 * ```
 */
export async function getOrInitializeSDK(config?: SDKConfig): Promise<SDK> {
  // Configure with your application ID
  return sdkService.getOrInitializeSDK({ 
    application_id: 'your-app-name', 
    ...config 
  });
}
```

### 2. Service Layer Architecture (REQUIRED)

**NEVER** access SDK directly from components. Always use services.

```typescript
// ❌ WRONG - Direct SDK in component
const sdk = await getOrInitializeSDK();
const items = await sdk.collection('items').getAll();

// ✅ CORRECT - Use service
import { inventoryService } from '$lib/services';
const items = await inventoryService.getAllItems();
```

**Base Service Template:**

```typescript
// services/base.service.ts
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
        if (Array.isArray(filter.value)) {
          collection = collection.filter(filter.column, filter.operator, filter.value);
        } else {
          collection = collection.filter(filter.column, filter.operator, filter.value);
        }
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
   * Example:
   * {
   *   name: "Product A",
   *   categoryId: {
   *     Table: "mrp_demo.product_categories",
   *     ID: "PC-001"
   *   }
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
   * @param recordId - Record ID in format: "application_id.collection_name:id" (e.g., "mrp_demo.suppliers:SUP-001")
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
        if (Array.isArray(filter.value)) {
          collection = collection.filter(filter.column, filter.operator, filter.value);
        } else {
          collection = collection.filter(filter.column, filter.operator, filter.value);
        }
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
   * Example:
   * {
   *   name: "Product A",
   *   categoryId: {
   *     Table: "mrp_demo.product_categories",
   *     ID: "PC-001"
   *   }
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
   * @param recordId - Record ID in format: "application_id.collection_name:id" (e.g., "mrp_demo.suppliers:SUP-001")
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

### 3. Reference Field Format (CRITICAL)

**RecordID Format:**

Record IDs in Machhub follow this format: `"application_id.collection_name:record_id"`

Example: `"app_1.categories:CAT-001"`

When creating or updating records with reference/linked fields, use this exact format:

```typescript
{
  Table: "application_id.collection_name",
  ID: "record_id"
}
```

**RecordID Utility Functions:**

```typescript
import { RecordIDToString, StringToRecordID, type RecordID } from '@machhub-dev/sdk-ts';

// Convert RecordID object to string
const recordID: RecordID = { Table: "app_1.categories", ID: "CAT-001" };
const idString = RecordIDToString(recordID);
// Result: "app_1.categories:CAT-001"

// Convert string to RecordID object
const idString = "app_1.categories:CAT-001";
const recordID = StringToRecordID(idString);
// Result: { Table: "app_1.categories", ID: "CAT-001" }
```

**Creating Records with Reference Fields:**
```typescript
await sdk.collection('products').create({
  name: 'Widget A',
  categoryId: {
    Table: "app_1.categories",
    ID: "CAT-001"
  }
});
```

**Reading Reference Fields:**

When you read records from MACHHUB, reference fields come back in different formats:

```typescript
// Format 1: Nested object
{
  id: { ID: "PROD-001" },
  productName: "Widget A",
  categoryId: { ID: "app_1.categories:CAT-001" }
}

// Format 2: String reference
{
  id: "PROD-001",
  productName: "Widget A",
  categoryId: "app_1.categories:CAT-001"
}
```

**Extracting IDs from Reference Fields:**

```typescript
// Helper function to extract just the ID part
function extractId(value: any): string {
  // Handle nested object: { ID: "app_1.categories:CAT-001" }
  if (typeof value === 'object' && value?.ID) {
    value = value.ID;
  }
  
  // Handle string reference: "app_1.categories:CAT-001"
  if (typeof value === 'string' && value.includes(':')) {
    return value.split(':')[1]; // Returns "CAT-001"
  }
  
  return value;
}

// Usage when loading data
const products = await sdk.collection('products').getAll();
const mappedProducts = products.map(product => ({
  ...product,
  id: extractId(product.id),
  categoryId: extractId(product.categoryId)
}));
```

**Complete Workflow Example:**

```typescript
// 1. Load data and extract IDs for display
const routes = await sdk.collection('routes').getAll();
const processedRoutes = routes.map(route => ({
  ...route,
  id: extractId(route.id),
  productCategoryId: extractId(route.productCategoryId) // "PC-001"
}));

// 2. Display in UI (use extracted ID)
// Form dropdown binds to: route.productCategoryId = "PC-001"

// 3. Save/Update - convert back to reference format
const routeToSave = {
  routeCode: 'RT-001',
  routeName: 'Machining Route',
  productCategoryId: {
    Table: "app_1.product_categories",
    ID: "PC-001"  // The ID from the form
  }
};

// Create
await sdk.collection('routes').create(routeToSave);

// Update (note the recordId format for updates)
await sdk.collection('routes').update(
  'app_1.routes:RT-001',  // Full reference format for record ID
  routeToSave
);
```

## SDK Modules Quick Reference

### Collections

**Available Collection Field Types:**
- `string` - Text fields
- `url` - URL fields
- `file` - File upload fields
- `editor` - Rich text editor fields
- `number` - Numeric fields
- `boolean` / `bool` - Boolean fields
- `date` - Date/datetime fields
- `json` - JSON object or array fields
- `relation` - Reference to other collection records (single or multiple)

**Important:** When receiving data from the API, any fields that are `relation` type or the record `id` field will be returned as **RecordID** type (SurrealDB format) UNLESS you use the `expand()` method to fetch the full related records.

```typescript
const sdk = await getOrInitializeSDK();
const collection = sdk.collection('items');

// Basic Query with Chaining
await collection
  .filter('status', '=', 'active')
  .sort('created_at', 'desc')
  .offset(0)
  .limit(10)
  .getAll();

// Operators: '=', '!=', '>', '<', '>=', '<=', 'CONTAINS', 'IN'

// Get first result
const firstItem = await collection
  .filter('name', 'CONTAINS', 'widget')
  .first();

// Get count
const count = await collection
  .filter('status', '=', 'active')
  .count();

// Get single record by ID (use RecordIDToString for RecordID objects)
import { RecordIDToString } from '@machhub-dev/sdk-ts';
const item = await collection.getOne('app_1.items:123');
// or if you have a RecordID object:
const itemId = RecordIDToString(recordID);
const item = await collection.getOne(itemId);

// Expand related records (converts RecordID to full objects)
const itemsWithCategory = await collection.getAll({
  expand: 'categoryId'  // or ['categoryId', 'supplierId']
});

// Select specific fields only
const items = await collection.getAll({
  fields: ['name', 'price']  // or 'name,price'
});

// Create record
await collection.create({
  name: 'Widget A',
  price: 29.99,
  categoryId: {
    Table: "app_1.categories",
    ID: "CAT-001"
  }
});

// Update record (PATCH - partial update, only updates provided fields)
await collection.update('app_1.items:123', {
  price: 34.99  // Only updates price, leaves other fields unchanged
});

// Delete record
await collection.delete('app_1.items:123');
```

### File Upload & Retrieval

When working with `file` type fields in collections:

**Uploading Files:**
```typescript
import { RecordIDToString } from '@machhub-dev/sdk-ts';

async function handleImageSave(file: File) {
  if (!item) return;

  try {
    isSaving = true;
    const itemId = typeof item.id === 'string' 
      ? item.id 
      : RecordIDToString(item.id);

    // When updating, pass File object directly (PATCH - partial update)
    const updatedItem = await itemService.updateItem(itemId, {
      image: file  // ✅ Pass File object for upload, only updates this field
    });

    console.log('Image saved successfully');
  } catch (error) {
    console.error('Failed to save image:', error);
  } finally {
    isSaving = false;
  }
}
```

**Retrieving Files:**
```typescript
// API returns file field as string (filename)
const item = await collection.getOne('app_1.items:123');
console.log(item.image); // "photo.jpg" (string)

// To get actual file as Blob:
const sdk = await getOrInitializeSDK();
const collection = sdk.collection('items');

const imageBlob = await collection.getFile(
  item.image,    // fileName (string from API response)
  'image'        // fieldName in collection
);

// Use the Blob (e.g., create object URL for display)
const imageUrl = URL.createObjectURL(imageBlob);
```

**Complete File Handling Example:**
```typescript
// Service method for uploading item with image
async updateItemWithImage(itemId: string, data: Partial<Item>, imageFile?: File) {
  const sdk = await getOrInitializeSDK();
  const collection = sdk.collection('items');

  if (imageFile) {
    data.image = imageFile;  // SDK handles FormData conversion
  }

  return await collection.update(itemId, data);
}

// Service method for retrieving item image
async getItemImage(item: Item): Promise<string | null> {
  if (!item.image) return null;

  try {
    const sdk = await getOrInitializeSDK();
    const collection = sdk.collection('items');
    
    const blob = await collection.getFile(item.image, 'image');
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Failed to load image:', error);
    return null;
  }
}
```

### Authentication
```typescript
// Login & Logout
await sdk.auth.login(username, password);
await sdk.auth.logout();

// Current User
const user = await sdk.auth.getCurrentUser();
const jwtData = await sdk.auth.getJWTData();

// JWT Validation
const { valid } = await sdk.auth.validateCurrentUser();
await sdk.auth.validateJWT(token);

// Permissions
const actions = await sdk.auth.checkAction('feature', 'scope');
const permitted = await sdk.auth.checkPermission('feature', 'scope', 'read');

// User Management
const users = await sdk.auth.getUsers();
const user = await sdk.auth.getUserById(userId);
await sdk.auth.createUser(firstName, lastName, username, email, password, number, userImage);

// Group Management
const groups = await sdk.auth.getGroups();
const group = await sdk.auth.createGroup('GroupName', features);
await sdk.auth.addUserToGroup(userId, groupId);
await sdk.auth.addPermissionsToGroup(groupId, permissions);
```

### Tags (Real-time)
```typescript
// Get all available tags
const tags = await sdk.tag.getAllTags();
// Returns: ['tag1', 'tag2', 'tag3']

// Publish to a topic
await sdk.tag.publish('topic/path', { 
  value: 123, 
  status: 'active' 
});

// Publish to a topic (simple value)
await sdk.tag.publish('topic/sensor/temperature', 123);

// Subscribe to tag/topic updates (real-time)
// Basic subscription (backwards compatible)
await sdk.tag.subscribe('topic/sensor/temperature', (data) => {
  console.log('Tag update:', data);
  // { value: 25.5, timestamp: '2024-01-01T00:00:00Z' }
});

// Subscribe with topic name access (useful for wildcard topics)
await sdk.tag.subscribe('topic/sensor/+/temperature', (data, topic) => {
  console.log(`Update from ${topic}:`, data);
  // topic might be: 'topic/sensor/room1/temperature'
  // data: { value: 25.5, timestamp: '2024-01-01T00:00:00Z' }
});

// Wildcard subscriptions
// Single-level wildcard (+)
await sdk.tag.subscribe('topic/sensor/+/temperature', (data, topic) => {
  // Matches: topic/sensor/room1/temperature, topic/sensor/room2/temperature
  console.log(`${topic}: ${data.value}`);
});

// Multi-level wildcard (#)
await sdk.tag.subscribe('topic/sensor/#', (data, topic) => {
  // Matches: topic/sensor/room1/temperature, topic/sensor/room1/humidity, etc.
  console.log(`${topic}:`, data);
});

// IMPORTANT: Always unsubscribe on cleanup
sdk.tag.unsubscribe(['topic/sensor/temperature']);
```

### Historian (Time-series)
```typescript
const history = await sdk.historian.query({
  tagNames: ['temperature'],
  startTime: '2024-01-01T00:00:00Z',
  endTime: '2024-01-02T00:00:00Z',
  interval: '1h',
  aggregation: 'avg'  // avg, min, max, sum, count
});
```

### Functions
```typescript
const result = await sdk.function.invoke('functionName', { param: 'value' });
```

### Flows
```typescript
const result = await sdk.flow.execute('flowName', { input: 'data' });
```

## Service Index

```typescript
// services/index.ts
// SDK Service
export { sdkService, getOrInitializeSDK } from './sdk.service';

// Base Service
export { BaseService } from './base.service';
export type { FilterOption, PaginationOptions } from './base.service';

// Domain Services
export { inventoryService } from './inventory.service';
export { userService } from './user.service';
export { auditService } from './audit.service';
// ... export other services
```

## Complete Domain Service Example

```typescript
// services/inventory.service.ts
import { BaseService } from './base.service';
import { getOrInitializeSDK } from './sdk.service';

interface Item {
  id: string;
  name: string;
  quantity: number;
  image?: string;  // File field (returned as filename string)
  categoryId?: any;
}

class InventoryService extends BaseService {
  private collectionName = 'items';

  async getAllItems(): Promise<Item[]> {
    try {
      return await this.getAllRecords<Item>(this.collectionName);
    } catch (error) {
      console.error('Error fetching items:', error);
      throw error;
    }
  }

  async getItemsWithCategory(): Promise<Item[]> {
    try {
      const sdk = await getOrInitializeSDK();
      return await sdk.collection(this.collectionName)
        .expand('categoryId')  // Fetch full category data
        .getAll();
    } catch (error) {
      console.error('Error fetching items with categories:', error);
      throw error;
    }
  }

  async createItem(data: Partial<Item>): Promise<Item> {
    try {
      return await this.createRecord<Item>(this.collectionName, data);
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  }

  async updateItem(id: string, data: Partial<Item>): Promise<Item> {
    try {
      return await this.updateRecord<Item>(this.collectionName, id, data);
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  }

  async getLowStock(threshold: number = 10): Promise<Item[]> {
    try {
      const sdk = await getOrInitializeSDK();
      return await sdk.collection(this.collectionName)
        .filter('quantity', '<', threshold)
        .sort('quantity', 'asc')
        .getAll() as Item[];
    } catch (error) {
      console.error('Error fetching low stock:', error);
      throw error;
    }
  }

  async getItemImage(item: Item): Promise<Blob | null> {
    if (!item.image) return null;

    try {
      const sdk = await getOrInitializeSDK();
      const collection = sdk.collection(this.collectionName);
      return await collection.getFile(item.image, 'image');
    } catch (error) {
      console.error('Error fetching item image:', error);
      throw error;
    }
  }

  async getItemCount(filters?: any): Promise<number> {
    try {
      const sdk = await getOrInitializeSDK();
      const collection = sdk.collection(this.collectionName);
      
      if (filters) {
        Object.entries(filters).forEach(([field, value]: [string, any]) => {
          collection.filter(field, '=', value);
        });
      }
      
      return await collection.count();
    } catch (error) {
      console.error('Error getting item count:', error);
      throw error;
    }
  }
}

export const inventoryService = new InventoryService();
```


**Get First Match:**
```typescript
async findFirstActive() {
  const sdk = await getOrInitializeSDK();
  const item = await sdk.collection('items')
    .filter('status', '=', 'active')
    .first();  // Returns first result or null
  return item;
}
```

**Count with Filters:**
```typescript
async countActiveItems() {
  const sdk = await getOrInitializeSDK();
  const count = await sdk.collection('items')
    .filter('status', '=', 'active')
    .count();
  return count;
}
```

**Working with Relations:**
```typescript (unless using `expand()`)
- [ ] File uploads pass `File` object, not filename string
- [ ] File retrieval uses `collection.getFile(fileName, fieldName)` to get Blob
- [ ] Understand that relation/id fields return as RecordID unless `expand()` is used
- [ ] Use `first()` for single results, `count()` for totals
// Without expand - returns RecordID
const items = await sdk.collection('items').getAll();
console.log(items[0].categoryId); // { Table: "categories", ID: "CAT-001" }

// With expand - returns full object
const itemsExpanded = await sdk.collection('items').getAll({
  expand: 'categoryId'
});
console.log(itemsExpanded[0].categoryId); // { id: "...", name: "Electronics", ... }

// Multiple expands
const itemsFull = await sdk.collection('items').getAll({
  expand: ['categoryId', 'supplierId', 'warehouseId']
});
```

**Select Specific Fields:**
```typescript
async getItemNames() {
  const sdk = await getOrInitializeSDK();
  return await sdk.collection('items').getAll({
    fields: ['name', 'price']  // Only fetch these fields
  });
}
```
## Initialization in App

```typescript
// +layout.svelte (SvelteKit) or App root
import { onMount } from 'svelte';
import { getOrInitializeSDK } from '$lib/services';
import type { SDK } from '@machhub-dev/sdk-ts';

let sdk: SDK;
let isInitialized = false;

onMount(async () => {
  try {
    // Initialize SDK once at app startup
    sdk = await getOrInitializeSDK();
    isInitialized = true;
    
    // Check authentication if needed
    if (!isPublicPage) {
      await checkAuthentication();
    }
  } catch (error) {
    console.error('SDK initialization failed:', error);
    // Handle error (e.g., redirect to error page)
  }
});

async function checkAuthentication() {
  try {
    const sdk = await getOrInitializeSDK();
    const validationResult = await sdk.auth.validateCurrentUser();
    
    if (!validationResult.valid) {
      // Handle invalid token (redirect to login)
      goto('/login');
      return;
    }
    
    // Get current user info
    const currentUser = await sdk.auth.getCurrentUser();
    // Update app state with user info
  } catch (error) {
    console.error('Authentication check failed:', error);
  }
}
```

## Use Cases

### 1. IoT Data Collection with Tag Service
```typescript
class SensorService extends BaseService {
  async recordSensorData() {
    const sdk = await getOrInitializeSDK();
    
    // Read sensor tags
    const sensors = await sdk.tag.read(['temp_sensor_1', 'humidity_sensor_1']);
    
    // Store in database
    return this.createRecord('sensor_readings', {
      temperature: sensors.temp_sensor_1,
      humidity: sensors.humidity_sensor_1,
      timestamp: new Date().toISOString()
    });
  }
}
```

### 2. Real-time Monitoring with Subscriptions
```typescript
class MonitoringService {
  async startMonitoring(onUpdate: (data: any) => void) {
    const sdk = await getOrInitializeSDK();
    
    sdk.tag.subscribe(['alarm_status', 'system_health'], async (update) => {
      if (update.alarm_status === true) {
        // Trigger alert through function
        await sdk.function.invoke('sendAlert', { 
          message: 'Alarm triggered!' 
        });
      }
      onUpdate(update);
    });
  }
  
  async stopMonitoring() {
    const sdk = await getOrInitializeSDK();
    sdk.tag.unsubscribe(['alarm_status', 'system_health']);
  }
}
```

### 3. Historical Analysis
```typescript
class AnalyticsService {
  async getProductionTrends() {
    const sdk = await getOrInitializeSDK();
    
    // Get last 24 hours with hourly averages
    const data = await sdk.historian.query({
      tagNames: ['production_rate'],
      startTime: new Date(Date.now() - 24*60*60*1000).toISOString(),
      endTime: new Date().toISOString(),
      interval: '1h',
      aggregation: 'avg'
    });
    
    return {
      data,
      average: data.reduce((sum, d) => sum + d.value, 0) / data.length
    };
  }
}
```

### 4. Workflow Automation
```typescript
class WorkflowService {
  async processData(sourceCollection: string, destinationCollection: string) {
    const sdk = await getOrInitializeSDK();
    
    // Trigger data processing flow
    return await sdk.flow.execute('data_processing_flow', {
      source: sourceCollection,
      destination: destinationCollection,
      filters: { quality: 'good' }
    });
  }
}
```

## Code Generation Checklist

When generating Machhub SDK code, always ensure:

- [ ] SDK initialized using singleton pattern (SDKService class)
- [ ] Services extend BaseService
- [ ] No direct SDK access in components
- [ ] Reference fields use `{ Table, ID }` format
- [ ] Use `RecordIDToString()` and `StringToRecordID()` utilities for ID conversions
- [ ] RecordID strings use format: `"app_id.collection_name:record_id"`
- [ ] File uploads pass `File` object, not filename string
- [ ] File retrieval uses `collection.getFile(fileName, fieldName)` to get Blob
- [ ] Understand that relation/id fields return as RecordID unless `expand()` is used
- [ ] Remember `update()` is PATCH (partial update) - only provided fields are updated
- [ ] Use `first()` for single results, `count()` for totals
- [ ] Error handling with try-catch
- [ ] Browser environment check (`!browser`) for SSR
- [ ] TypeScript interfaces defined
- [ ] Methods have JSDoc comments
- [ ] Tag subscriptions have cleanup (`unsubscribe`)

## Common Patterns

**Pagination:**
```typescript
async getPaginated(pageIndex: number, pageSize: number) {
  const sdk = await getOrInitializeSDK();
  return await sdk.collection('items')
    .offset(pageIndex * pageSize)
    .limit(pageSize)
    .getAll();
}
```

**Filtered Query:**
```typescript
async getByStatus(status: string) {
  const sdk = await getOrInitializeSDK();
  return await sdk.collection('items')
    .filter('status', '=', status)
    .getAll();
}
```

**Real-time Monitoring:**
```typescript
async startMonitoring(callback: (data: any) => void) {
  const sdk = await getOrInitializeSDK();
  sdk.tag.subscribe(['sensor1'], callback);
}

async stopMonitoring() {
  const sdk = await getOrInitializeSDK();
  sdk.tag.unsubscribe(['sensor1']);
}
```

**Get Current User's Groups:**
```typescript
import { RecordIDToString } from '@machhub-dev/sdk-ts';

async getUserGroups(): Promise<Group[]> {
  try {
    const sdk = await getOrInitializeSDK();
    const user = await sdk.auth.getCurrentUser();
    
    // Get the user's group IDs from user data
    const groupIds = user.group_ids;
    
    if (!groupIds || groupIds.length === 0) {
      console.warn('User has no group IDs');
      return [];
    }

    // Get all groups from SDK
    const groups = await sdk.auth.getGroups();
    
    // Find all the user's groups - convert RecordID to string for comparison
    const userGroups = groups.filter(group => {
      if (!group.id) return false;
      const groupIdStr = RecordIDToString(group.id);
      return groupIds.includes(groupIdStr);
    });
    
    return userGroups;
  } catch (error) {
    console.error('Error fetching user groups:', error);
    throw error;
  }
}
```

**Permission Checking:**
```typescript
async checkUserPermission(feature: string, scope: string, action: Action): Promise<boolean> {
  try {
    const sdk = await getOrInitializeSDK();
    const result = await sdk.auth.checkPermission(feature, scope, action);
    return result.allowed || false;
  } catch (error) {
    console.error('Permission check failed:', error);
    return false;
  }
}

async getAvailableActions(feature: string, scope: string): Promise<Action[]> {
  try {
    const sdk = await getOrInitializeSDK();
    const result = await sdk.auth.checkAction(feature, scope);
    return result.actions || [];
  } catch (error) {
    console.error('Failed to get actions:', error);
    return [];
  }
}
```

## Error Handling Pattern

**In Services:**
```typescript
async getItems(): Promise<Item[]> {
  try {
    const sdk = await getOrInitializeSDK();
    return await sdk.collection('items').getAll();
  } catch (error) {
    console.error('Error fetching items:', error);
    throw error; // Re-throw for component handling
  }
}
```

**In Components:**
```typescript
try {
  const items = await inventoryService.getAllItems();
} catch (error: any) {
  if (error.status === 401) {
    goto('/login');
  } else {
    toast.error('Failed to load items');
  }
}
```

## TypeScript Types

```typescript
import { 
  SDK,
  type SDKConfig,
  type IAuthCredentials,
  type IUser,
  type ITagValue,
  type IHistorianQuery,
  type RecordID,
  RecordIDToString,
  StringToRecordID
} from '@machhub-dev/sdk-ts';

// Configuration
interface SDKConfig {
  application_id: string;
  baseURL?: string;
  mqttURL?: string;
  natsURL?: string;
  timeout?: number;
  retryAttempts?: number;
}

// Tag value
interface ITagValue {
  value: any;
  quality: 'good' | 'bad' | 'uncertain';
  timestamp: string;
}

// RecordID type (SurrealDB format)
interface RecordID {
  Table: string;  // "application_id.collection_name"
  ID: string;     // "record_id"
}
```

## Best Practices Summary

1. ✅ **Always use the Singleton Pattern**: One SDK instance for the entire app
2. ✅ **Use Services Layer**: Never call SDK directly from components
3. ✅ **Extend BaseService**: Inherit common CRUD operations
4. ✅ **Initialize Once**: In your root layout/app component
5. ✅ **Use getOrInitializeSDK()**: Let the service handle initialization
6. ✅ **Handle SSR**: Check for browser environment before initialization
7. ✅ **Implement Error Handling**: Wrap service calls in try-catch
8. ✅ **Type Everything**: Leverage TypeScript for type safety
9. ✅ **Unsubscribe**: Clean up tag subscriptions when components unmount
10. ✅ **Centralize Configuration**: Set application_id and config in one place
11. ✅ **Use RecordID utilities**: Use RecordIDToString() and StringToRecordID() for conversions
12. ✅ **Reference fields format**: Use { Table, ID } format for create/update operations
13. ✅ **Extract IDs properly**: Handle both nested objects and string references when reading
14. ✅ **Use expand()**: Fetch full related records when needed instead of RecordID objects
15. ✅ **Remember PATCH behavior**: update() only modifies provided fields

## Environment Variables (Optional)

```bash
MACHHUB_BASE_URL=https://api.machhub.com
MACHHUB_MQTT_URL=mqtt://mqtt.machhub.com
MACHHUB_NATS_URL=nats://nats.machhub.com
MACHHUB_APP_ID=your-app-name
```

## Project Structure Recommendation

```
src/
├── lib/
│   ├── services/
│   │   ├── index.ts                 # Export all services
│   │   ├── sdk.service.ts           # Singleton SDK service
│   │   ├── base.service.ts          # Base service class
│   │   ├── inventory.service.ts     # Domain service
│   │   ├── user.service.ts          # Domain service
│   │   └── audit.service.ts         # Domain service
│   ├── models/
│   │   ├── inventory.ts             # Type definitions
│   │   └── user.ts                  # Type definitions
│   └── stores/
│       └── auth.store.ts            # State management
└── routes/
    ├── +layout.svelte               # Initialize SDK here
    └── ...
```

## When to Use This Skill

Use this Skill whenever the user:
- Mentions "Machhub", "@machhub-dev/sdk-ts", or Machhub API
- Asks about SDK initialization or setup
- Needs help with collections, CRUD operations, or queries
- Works with authentication or user management
- Implements real-time tag subscriptions
- Queries historical time-series data
- Invokes remote functions or workflows
- Asks about Machhub best practices or patterns
- Needs to fix reference field issues
- Works with RecordID conversions or reference field formatting

## Resources

**Installation:**
```bash
npm install @machhub-dev/sdk-ts
```

**Key Links:**
- SDK Docs: https://docs.machhub.dev
- GitHub: https://github.com/machhub-dev/sdk-ts
- NPM: https://www.npmjs.com/package/@machhub-dev/sdk-ts
