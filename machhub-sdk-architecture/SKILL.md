---
name: machhub-sdk-architecture
description: Service layer architecture patterns for MACHHUB SDK including singleton pattern, BaseService implementation, and project structure recommendations.
related_skills: [machhub-sdk-initialization, machhub-sdk-collections, machhub-sdk-authentication]
---

## Overview

This skill teaches **service layer architecture patterns** for building maintainable, scalable applications with the MACHHUB SDK. It enforces separation of concerns, testability, and clean code principles.

**Use this skill when:**
- Structuring a new MACHHUB project
- Creating service classes for data access
- Implementing pagination and filtering
- Building reusable data access patterns
- Organizing code for maintainability

**Prerequisites:**
- SDK initialized using **Designer Extension (zero-config recommended)** - see `machhub-sdk-initialization`
- For production: Manual configuration - see `machhub-sdk-initialization` templates

**Related Skills:**
- `machhub-sdk-initialization` - SDK setup required first
- `machhub-sdk-collections` - Implements these patterns for CRUD operations
- `machhub-sdk-authentication` - Auth services follow these patterns

---

## Core Architecture Principles

### 1. Service Layer Pattern (REQUIRED)

**NEVER access SDK directly from components. Always use service classes.**

```typescript
// ❌ WRONG - Direct SDK in component
import { getOrInitializeSDK } from './sdk.service';

async function loadItems() {
  const sdk = await getOrInitializeSDK();
  const items = await sdk.collection('items').getAll();
  return items;
}

// ✅ CORRECT - Use service layer
import { inventoryService } from './services';

async function loadItems() {
  const items = await inventoryService.getAllItems();
  return items;
}
```

### Why Service Layer?

- ✅ **Separation of Concerns** - Business logic separate from UI
- ✅ **Testability** - Mock services easily in tests
- ✅ **Reusability** - Share logic across components
- ✅ **Maintainability** - Change implementation without touching UI
- ✅ **Type Safety** - Strong typing at service boundaries

---

## BaseService Template

### Complete Implementation

```typescript
// services/base.service.ts
import { getOrInitializeSDK } from './sdk.service';
import type { SDK } from '@machhub-dev/sdk-ts';

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
 * Extend this class for all domain-specific services
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
   * Get paginated records with sorting and filtering
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
        collection = collection.filter(
          filter.column,
          filter.operator,
          filter.value
        );
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
        collection = collection.filter(
          filter.column,
          filter.operator,
          filter.value
        );
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
   * Update a record (PATCH - partial update)
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
   * Get first matching record
   */
  protected async getFirstRecord<T>(
    collectionName: string,
    filters?: FilterOption[]
  ): Promise<T | null> {
    const sdk = await getOrInitializeSDK();
    let collection = sdk.collection(collectionName);

    if (filters && filters.length > 0) {
      for (const filter of filters) {
        collection = collection.filter(
          filter.column,
          filter.operator,
          filter.value
        );
      }
    }

    return (await collection.first()) as T | null;
  }

  /**
   * Check if record exists
   */
  protected async recordExists(
    collectionName: string,
    filters: FilterOption[]
  ): Promise<boolean> {
    const count = await this.getTotalRecordsCount(collectionName, filters);
    return count > 0;
  }
}
```

---

## Domain Service Example

### Complete Inventory Service

```typescript
// services/inventory.service.ts
import { BaseService, type FilterOption } from './base.service';
import { getOrInitializeSDK } from './sdk.service';

/**
 * Item interface
 */
export interface Item {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  categoryId?: any;
  image?: string;
  status: 'active' | 'inactive' | 'discontinued';
  created_dt?: Date;
  updated_dt?: Date;
}

/**
 * Inventory Service - Manages item operations
 */
class InventoryService extends BaseService {
  private collectionName = 'items';

  /**
   * Get all items
   */
  async getAllItems(): Promise<Item[]> {
    try {
      return await this.getAllRecords<Item>(this.collectionName);
    } catch (error) {
      console.error('Error fetching items:', error);
      throw error;
    }
  }

  /**
   * Get items with category data expanded
   */
  async getItemsWithCategory(): Promise<Item[]> {
    try {
      const sdk = await getOrInitializeSDK();
      return await sdk
        .collection(this.collectionName)
        .expand('categoryId')
        .getAll() as Item[];
    } catch (error) {
      console.error('Error fetching items with categories:', error);
      throw error;
    }
  }

  /**
   * Get item by ID
   */
  async getItemById(id: string): Promise<Item | null> {
    try {
      return await this.getRecordById<Item>(this.collectionName, id);
    } catch (error) {
      console.error('Error fetching item:', error);
      throw error;
    }
  }

  /**
   * Create new item
   */
  async createItem(data: Partial<Item>): Promise<Item> {
    try {
      return await this.createRecord<Item>(this.collectionName, data);
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  }

  /**
   * Update item (partial update)
   */
  async updateItem(id: string, data: Partial<Item>): Promise<Item> {
    try {
      return await this.updateRecord<Item>(this.collectionName, id, data);
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  }

  /**
   * Delete item
   */
  async deleteItem(id: string): Promise<void> {
    try {
      await this.deleteRecord(this.collectionName, id);
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  }

  /**
   * Get low stock items
   */
  async getLowStockItems(threshold: number = 10): Promise<Item[]> {
    try {
      const sdk = await getOrInitializeSDK();
      return await sdk
        .collection(this.collectionName)
        .filter('quantity', '<', threshold)
        .filter('status', '=', 'active')
        .sort('quantity', 'asc')
        .getAll() as Item[];
    } catch (error) {
      console.error('Error fetching low stock items:', error);
      throw error;
    }
  }

  /**
   * Get items by category
   */
  async getItemsByCategory(categoryId: string): Promise<Item[]> {
    try {
      const sdk = await getOrInitializeSDK();
      return await sdk
        .collection(this.collectionName)
        .filter('categoryId', '=', categoryId)
        .getAll() as Item[];
    } catch (error) {
      console.error('Error fetching items by category:', error);
      throw error;
    }
  }

  /**
   * Search items by name or SKU
   */
  async searchItems(query: string): Promise<Item[]> {
    try {
      const sdk = await getOrInitializeSDK();
      // Search in name
      const byName = await sdk
        .collection(this.collectionName)
        .filter('name', 'CONTAINS', query)
        .getAll() as Item[];

      // Search in SKU
      const bySku = await sdk
        .collection(this.collectionName)
        .filter('sku', 'CONTAINS', query)
        .getAll() as Item[];

      // Combine and deduplicate
      const combined = [...byName, ...bySku];
      const unique = combined.filter(
        (item, index, self) => self.findIndex(i => i.id === item.id) === index
      );

      return unique;
    } catch (error) {
      console.error('Error searching items:', error);
      throw error;
    }
  }

  /**
   * Get item count by status
   */
  async getItemCountByStatus(status: Item['status']): Promise<number> {
    try {
      const filters: FilterOption[] = [
        { column: 'status', operator: '=', value: status }
      ];
      return await this.getTotalRecordsCount(this.collectionName, filters);
    } catch (error) {
      console.error('Error getting item count:', error);
      throw error;
    }
  }

  /**
   * Check if SKU exists
   */
  async skuExists(sku: string): Promise<boolean> {
    try {
      const filters: FilterOption[] = [
        { column: 'sku', operator: '=', value: sku }
      ];
      return await this.recordExists(this.collectionName, filters);
    } catch (error) {
      console.error('Error checking SKU:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const inventoryService = new InventoryService();
```

---

## Service Index Pattern

### Centralized Export

```typescript
// services/index.ts

// Core Services
export { sdkService, getOrInitializeSDK } from './sdk.service';

// Base Service
export { BaseService } from './base.service';
export type { FilterOption, PaginationOptions } from './base.service';

// Domain Services
export { inventoryService } from './inventory.service';
export type { Item } from './inventory.service';

export { categoryService } from './category.service';
export type { Category } from './category.service';

export { orderService } from './order.service';
export type { Order } from './order.service';

export { userService } from './user.service';
export type { User } from './user.service';

// Add more services as needed
```

### Usage in Application

```typescript
// Import everything from central location
import { inventoryService, categoryService, type Item } from './services';

// Use services
const items = await inventoryService.getAllItems();
const categories = await categoryService.getAllCategories();
```

---

## Error Handling in Services

### Service-Level Error Handling

```typescript
class ProductService extends BaseService {
  async getProduct(id: string): Promise<Product | null> {
    try {
      return await this.getRecordById<Product>('products', id);
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error; // Re-throw for component handling
    }
  }
}
```

### Component-Level Error Handling

```typescript
// In your application code
try {
  const product = await productService.getProduct(id);
  if (!product) {
    // Show error message
    return;
  }
  // Use product
} catch (error: any) {
  if (error.status === 401) {
    window.location.href = '/login';
  } else if (error.status === 404) {
    console.error('Product not found');
  } else {
    console.error('Failed to load product');
  }
}
```

---

## Project Structure

### Recommended Organization

```
src/
├── lib/
│   ├── services/
│   │   ├── index.ts                 # Central export
│   │   ├── sdk.service.ts           # SDK singleton
│   │   ├── base.service.ts          # Base service class
│   │   │
│   │   ├── inventory.service.ts     # Domain service
│   │   ├── category.service.ts      # Domain service
│   │   ├── order.service.ts         # Domain service
│   │   ├── user.service.ts          # Domain service
│   │   └── auth.service.ts          # Auth service
│   │
│   ├── models/
│   │   ├── item.ts                  # Item interface & types
│   │   ├── category.ts              # Category interface & types
│   │   ├── order.ts                 # Order interface & types
│   │   └── user.ts                  # User interface & types
│   │
│   ├── stores/
│   │   ├── auth.store.ts            # Auth state
│   │   ├── cart.store.ts            # Cart state
│   │   └── ui.store.ts              # UI state
│   │
│   └── utils/
│       ├── validation.ts            # Validation helpers
│       └── formatting.ts            # Formatting helpers
│
├── pages/                           # Or components/views depending on framework
│   ├── app.ts                       # Initialize SDK here
│   ├── items/
│   │   ├── list.ts                  # Use inventoryService
│   │   └── detail.ts                # Use inventoryService
│   └── ...
│
└── app.d.ts                         # Global types
```

---

## Testing Services

### Unit Testing BaseService

```typescript
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { sdkService } from './sdk.service';
import { BaseService } from './base.service';

class TestService extends BaseService {
  async getAll() {
    return this.getAllRecords('test_collection');
  }
}

describe('BaseService', () => {
  let testService: TestService;

  beforeEach(() => {
    testService = new TestService();
  });

  afterEach(() => {
    sdkService.reset();
  });

  test('getAllRecords returns data', async () => {
    const result = await testService.getAll();
    expect(Array.isArray(result)).toBe(true);
  });

  test('getPaginatedRecords applies pagination', async () => {
    const result = await testService.getPaginatedRecords('test', {
      pageIndex: 0,
      pageSize: 10
    });
    expect(result.length).toBeLessThanOrEqual(10);
  });
});
```

### Mocking Services in Tests

```typescript
import { vi } from 'vitest';
import * as services from './services';

describe('ItemList', () => {
  test('displays items from service', async () => {
    // Mock the service
    vi.spyOn(services.inventoryService, 'getAllItems').mockResolvedValue([
      { id: '1', name: 'Item 1', quantity: 10 },
      { id: '2', name: 'Item 2', quantity: 20 }
    ]);

    // Test component
    // ...
  });
});
```

---

## Common Patterns

### Pattern: Filtered List Service

```typescript
class ProductService extends BaseService {
  async getActiveProducts(): Promise<Product[]> {
    const sdk = await getOrInitializeSDK();
    return await sdk
      .collection('products')
      .filter('status', '=', 'active')
      .sort('name', 'asc')
      .getAll() as Product[];
  }
}
```

### Pattern: Cached Service

```typescript
class CategoryService extends BaseService {
  private cache: Category[] | null = null;
  private cacheTimestamp = 0;
  private cacheDuration = 60000; // 1 minute

  async getAllCategories(forceRefresh = false): Promise<Category[]> {
    const now = Date.now();
    
    if (!forceRefresh && this.cache && (now - this.cacheTimestamp < this.cacheDuration)) {
      return this.cache;
    }

    const categories = await this.getAllRecords<Category>('categories');
    this.cache = categories;
    this.cacheTimestamp = now;
    
    return categories;
  }

  clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }
}
```

### Pattern: Batch Operations

```typescript
class OrderService extends BaseService {
  async createMultipleOrders(orders: Partial<Order>[]): Promise<Order[]> {
    const results: Order[] = [];
    
    for (const order of orders) {
      try {
        const created = await this.createRecord<Order>('orders', order);
        results.push(created);
      } catch (error) {
        console.error('Failed to create order:', order, error);
        // Continue with others
      }
    }
    
    return results;
  }
}
```

---

## Templates

### Template 1: BaseService (Complete)

**File:** `src/services/base.service.ts`

**Purpose:** Base service class with common CRUD operations, pagination, and filtering

**Code:**

```typescript
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
    options?: { expand?: string[]; fields?: string[] }
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
```

---

### Template 2: Domain Service (Product Example)

**File:** `src/services/product.service.ts`

**Purpose:** Complete domain service extending BaseService with business logic

**Code:**

```typescript
// filepath: src/services/product.service.ts
import { BaseService } from './base.service';
import type { PaginationOptions, FilterOptions, SortOptions } from './base.service';

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  description?: string;
  categoryId?: string;
  stock: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

class ProductService extends BaseService {
  private collectionName = 'products';

  /**
   * Get all products with optional filtering and pagination
   */
  async getAllProducts(options?: {
    pagination?: PaginationOptions;
    filters?: FilterOptions[];
    sort?: SortOptions;
  }): Promise<Product[]> {
    const products = await this.getAllRecords<Product>(
      this.collectionName,
      options
    );
    return products.map(this.transformProduct);
  }

  /**
   * Get product by ID
   */
  async getProductById(id: string): Promise<Product | null> {
    const product = await this.getRecordById<Product>(
      this.collectionName,
      id,
      { expand: ['categoryId'] }
    );
    return product ? this.transformProduct(product) : null;
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    const products = await this.getAllRecords<Product>(
      this.collectionName,
      {
        filters: [{
          field: 'categoryId',
          operator: 'eq',
          value: `myapp.categories:${categoryId}`
        }]
      }
    );
    return products.map(this.transformProduct);
  }

  /**
   * Get active products only
   */
  async getActiveProducts(): Promise<Product[]> {
    const products = await this.getAllRecords<Product>(
      this.collectionName,
      {
        filters: [{
          field: 'isActive',
          operator: 'eq',
          value: true
        }],
        sort: { field: 'name', direction: 'asc' }
      }
    );
    return products.map(this.transformProduct);
  }

  /**
   * Search products by name
   */
  async searchProducts(query: string): Promise<Product[]> {
    const products = await this.getAllRecords<Product>(
      this.collectionName,
      {
        filters: [{
          field: 'name',
          operator: 'contains',
          value: query
        }]
      }
    );
    return products.map(this.transformProduct);
  }

  /**
   * Create new product
   */
  async createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    // Convert categoryId to reference format if provided
    const productData: any = { ...data };
    if (data.categoryId) {
      productData.categoryId = {
        Table: 'myapp.categories',
        ID: data.categoryId
      };
    }

    const created = await this.createRecord<Product>(
      this.collectionName,
      productData
    );
    return this.transformProduct(created);
  }

  /**
   * Update product
   */
  async updateProduct(
    id: string,
    updates: Partial<Omit<Product, 'id' | 'createdAt'>>
  ): Promise<Product> {
    // Convert categoryId to reference format if provided
    const updateData: any = { ...updates };
    if (updates.categoryId) {
      updateData.categoryId = {
        Table: 'myapp.categories',
        ID: updates.categoryId
      };
    }

    const updated = await this.updateRecord<Product>(
      this.collectionName,
      id,
      updateData
    );
    return this.transformProduct(updated);
  }

  /**
   * Delete product
   */
  async deleteProduct(id: string): Promise<void> {
    await this.deleteRecord(this.collectionName, id);
  }

  /**
   * Update product stock
   */
  async updateStock(id: string, quantity: number): Promise<Product> {
    return await this.updateProduct(id, { stock: quantity });
  }

  /**
   * Check if product is in stock
   */
  async isInStock(id: string): Promise<boolean> {
    const product = await this.getProductById(id);
    return product ? product.stock > 0 : false;
  }

  /**
   * Transform product from API format to app format
   */
  private transformProduct = (raw: any): Product => {
    return {
      id: this.extractId(raw.id),
      name: raw.name,
      sku: raw.sku,
      price: raw.price,
      description: raw.description,
      categoryId: raw.categoryId ? this.extractId(raw.categoryId) : undefined,
      stock: raw.stock,
      isActive: raw.isActive,
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt)
    };
  };
}

export const productService = new ProductService();
```

**Usage:**

```typescript
import { productService } from './services/product.service';

// Get all products
const products = await productService.getAllProducts({
  pagination: { page: 1, limit: 20 },
  sort: { field: 'name', direction: 'asc' }
});

// Search products
const results = await productService.searchProducts('laptop');

// Create product
const newProduct = await productService.createProduct({
  name: 'Laptop Pro',
  sku: 'LAP-001',
  price: 1299.99,
  stock: 50,
  isActive: true,
  categoryId: 'electronics'
});

// Update stock
await productService.updateStock(newProduct.id, 45);
```

---

### Template 3: Service Index

**File:** `src/services/index.ts`

**Purpose:** Central export for all services

**Code:**

```typescript
// filepath: src/services/index.ts
export { sdkService, getOrInitializeSDK } from './sdk.service';
export { BaseService } from './base.service';
export { productService } from './product.service';
export { categoryService } from './category.service';
export { orderService } from './order.service';

export type { PaginationOptions, FilterOptions, SortOptions } from './base.service';
export type { Product } from './product.service';
export type { Category } from './category.service';
export type { Order } from './order.service';
```

**Usage:**

```typescript
import { productService, categoryService, type Product } from './services';

const products: Product[] = await productService.getAllProducts();
const categories = await categoryService.getAllCategories();
```

---

### Template 4: Service with Relationships

**File:** `src/services/order.service.ts`

**Purpose:** Service handling complex relationships between collections

**Code:**

```typescript
// filepath: src/services/order.service.ts
import { BaseService } from './base.service';

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: Date;
}

class OrderService extends BaseService {
  private collectionName = 'orders';

  async getAllOrders(): Promise<Order[]> {
    const orders = await this.getAllRecords<Order>(this.collectionName, {
      expand: ['customerId', 'items.productId'],
      sort: { field: 'createdAt', direction: 'desc' }
    });
    return orders.map(this.transformOrder);
  }

  async getOrderById(id: string): Promise<Order | null> {
    const order = await this.getRecordById<Order>(
      this.collectionName,
      id,
      { expand: ['customerId', 'items.productId'] }
    );
    return order ? this.transformOrder(order) : null;
  }

  async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    const orders = await this.getAllRecords<Order>(this.collectionName, {
      filters: [{
        field: 'customerId',
        operator: 'eq',
        value: `myapp.customers:${customerId}`
      }]
    });
    return orders.map(this.transformOrder);
  }

  async createOrder(data: Omit<Order, 'id' | 'orderNumber' | 'createdAt'>): Promise<Order> {
    const orderData: any = {
      ...data,
      orderNumber: this.generateOrderNumber(),
      customerId: {
        Table: 'myapp.customers',
        ID: data.customerId
      },
      items: data.items.map(item => ({
        productId: {
          Table: 'myapp.products',
          ID: item.productId
        },
        quantity: item.quantity,
        price: item.price
      }))
    };

    const created = await this.createRecord<Order>(this.collectionName, orderData);
    return this.transformOrder(created);
  }

  async updateOrderStatus(
    id: string,
    status: Order['status']
  ): Promise<Order> {
    const updated = await this.updateRecord<Order>(
      this.collectionName,
      id,
      { status }
    );
    return this.transformOrder(updated);
  }

  private generateOrderNumber(): string {
    return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private transformOrder = (raw: any): Order => {
    return {
      id: this.extractId(raw.id),
      orderNumber: raw.orderNumber,
      customerId: this.extractId(raw.customerId),
      items: raw.items.map((item: any) => ({
        productId: this.extractId(item.productId),
        quantity: item.quantity,
        price: item.price
      })),
      totalAmount: raw.totalAmount,
      status: raw.status,
      createdAt: new Date(raw.createdAt)
    };
  };
}

export const orderService = new OrderService();
```

---

## Architecture Checklist

When implementing service architecture, ensure:

- [ ] **BaseService** created and all services extend it
- [ ] **No direct SDK access** in components (always use services)
- [ ] **Service index** exports all services from central location
- [ ] **Error handling** implemented at service level
- [ ] **TypeScript interfaces** defined for all domain models
- [ ] **Methods have JSDoc** comments describing parameters and return types
- [ ] **Singleton instances** exported for all services
- [ ] **Protected methods** in BaseService (not public)
- [ ] **Services are testable** (can mock dependencies)
- [ ] **Consistent naming** (e.g., getAllX, getXById, createX, updateX, deleteX)

---

## Best Practices

1. ✅ **Single Responsibility** - Each service handles one domain
2. ✅ **DRY Principle** - Use BaseService to avoid duplication
3. ✅ **Type Safety** - Define interfaces for all data models
4. ✅ **Error Handling** - Always wrap SDK calls in try-catch
5. ✅ **Consistent APIs** - Use similar method names across services
6. ✅ **Documentation** - Add JSDoc comments to all public methods
7. ✅ **Testing** - Write unit tests for service methods
8. ✅ **Separation** - Keep business logic in services, not components

---

## Next Steps

After setting up service architecture:
1. **Implement CRUD** → See `machhub-sdk-collections`
2. **Handle reference fields** → See `machhub-sdk-collections`
3. **Add authentication** → See `machhub-sdk-authentication`
4. **Implement real-time** → See `machhub-sdk-realtime`

---

## Resources

- **MACHHUB SDK Docs**: https://docs.machhub.dev
- **Initialization Guide**: See `machhub-sdk-initialization`
- **Collections Guide**: See `machhub-sdk-collections`
