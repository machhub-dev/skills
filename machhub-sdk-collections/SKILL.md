---
name: machhub-sdk-collections
description: Complete guide to CRUD operations, RecordID handling, reference fields, query building, and data operations with MACHHUB SDK collections.
related_skills: [machhub-sdk-initialization, machhub-sdk-architecture, machhub-sdk-file-handling]
---

## Overview

This skill covers **collection operations** in the MACHHUB SDK - the primary way to interact with database tables. It includes CRUD operations, reference field handling, query building, and the critical RecordID format.

**Use this skill when:**
- Performing database operations (create, read, update, delete)
- Working with reference/relation fields between collections
- Building queries with filters, sorting, and pagination
- Handling RecordID conversions
- Expanding related records

**Prerequisites:**
- SDK initialized using **Designer Extension (zero-config recommended)** - see `machhub-sdk-initialization`
- For production: Manual configuration - see `machhub-sdk-initialization` templates
- Service architecture set up (see `machhub-sdk-architecture`)

**Related Skills:**
- `machhub-sdk-initialization` - SDK must be initialized first
- `machhub-sdk-architecture` - Use BaseService for CRUD operations
- `machhub-sdk-file-handling` - For file upload/retrieval operations

---

## Collection Field Types

MACHHUB collections support these field types:

| Type       | Use Case                        | Example Fields                 |
| ---------- | ------------------------------- | ------------------------------ |
| `string`   | Plain text, codes, statuses     | name, description, sku, status |
| `url`      | URL strings (validated)         | website, documentUrl           |
| `file`     | File references                 | image, attachment, logo        |
| `editor`   | Rich text/HTML                  | description, content, notes    |
| `number`   | Integers or decimals            | quantity, price, age, rating   |
| `boolean`  | True/false flags                | isActive, isVerified, enabled  |
| `date`     | Date and time values            | createdAt, dueDate, timestamp  |
| `json`     | JSON objects/arrays             | metadata, config, customFields |
| `record`   | Record ID (for `id` field only) | id                             |
| `relation` | Reference to other collections  | categoryId, userId, orderId    |

---

## Reference Fields & RecordID Format (CRITICAL)

### Understanding RecordID

**ALL record identifiers in MACHHUB use this format:**

```
"application_id.collection_name:record_id"
```

**Examples:**
- `"myapp.products:PROD-001"`
- `"inventory_system.categories:CAT-123"`
- `"erp.customers:CUST-456"`

### RecordID Object Structure

When working with references, use this object format:

```typescript
{
  Table: "application_id.collection_name",
  ID: "record_id"
}
```

### RecordID Utility Functions

```typescript
import { RecordIDToString, StringToRecordID, type RecordID } from '@machhub-dev/sdk-ts';

// Convert RecordID object to string
const recordID: RecordID = { 
  Table: "myapp.categories", 
  ID: "CAT-001" 
};
const idString = RecordIDToString(recordID);
// Result: "myapp.categories:CAT-001"

// Convert string to RecordID object
const idString = "myapp.categories:CAT-001";
const recordID = StringToRecordID(idString);
// Result: { Table: "myapp.categories", ID: "CAT-001" }
```

---

## Creating Records with Reference Fields

### Basic Create

```typescript
import { getOrInitializeSDK } from './sdk.service';

const sdk = await getOrInitializeSDK();

// Create without references
await sdk.collection('categories').create({
  name: 'Electronics',
  description: 'Electronic products'
});

// Create with reference field
await sdk.collection('products').create({
  name: 'Laptop',
  price: 999.99,
  categoryId: {
    Table: "myapp.categories",
    ID: "CAT-001"
  }
});
```

### Create with Multiple References

```typescript
await sdk.collection('orders').create({
  orderNumber: 'ORD-001',
  customerId: {
    Table: "myapp.customers",
    ID: "CUST-123"
  },
  productId: {
    Table: "myapp.products",
    ID: "PROD-456"
  },
  quantity: 2,
  totalPrice: 1999.98
});
```

### Create with Multiple Relations (One-to-Many)

```typescript
await sdk.collection('orders').create({
  orderNumber: 'ORD-002',
  customerId: {
    Table: "myapp.customers",
    ID: "CUST-123"
  },
  // Multiple products (array of references)
  productIds: [
    { Table: "myapp.products", ID: "PROD-001" },
    { Table: "myapp.products", ID: "PROD-002" },
    { Table: "myapp.products", ID: "PROD-003" }
  ]
});
```

---

## Reading Records & Handling RecordID

### How RecordID Fields Are Returned

When reading from the API, reference fields come in two possible formats:

**Format 1: Nested Object**
```typescript
{
  id: { ID: "PROD-001" },
  name: "Laptop",
  categoryId: { ID: "myapp.categories:CAT-001" }
}
```

**Format 2: String Reference**
```typescript
{
  id: "PROD-001",
  name: "Laptop",
  categoryId: "myapp.categories:CAT-001"
}
```

### Extracting IDs for Display

```typescript
/**
 * Helper function to extract just the ID part from RecordID
 */
function extractId(value: any): string {
  // Handle nested object: { ID: "myapp.categories:CAT-001" }
  if (typeof value === 'object' && value?.ID) {
    value = value.ID;
  }
  
  // Handle string reference: "myapp.categories:CAT-001"
  if (typeof value === 'string' && value.includes(':')) {
    return value.split(':')[1]; // Returns "CAT-001"
  }
  
  return value;
}

// Usage
const products = await sdk.collection('products').getAll();
const displayProducts = products.map(product => ({
  ...product,
  id: extractId(product.id),
  categoryId: extractId(product.categoryId)
}));
```

### Complete CRUD Workflow with RecordID

```typescript
// 1. READ - Load data and extract IDs for display
const products = await sdk.collection('products').getAll();
const displayProducts = products.map(product => ({
  ...product,
  id: extractId(product.id),
  categoryId: extractId(product.categoryId) // "CAT-001"
}));

// 2. DISPLAY in UI
// Form dropdown binds to: product.categoryId = "CAT-001"

// 3. CREATE/UPDATE - Convert back to reference format
const productToSave = {
  name: 'New Product',
  price: 49.99,
  categoryId: {
    Table: "myapp.categories",
    ID: "CAT-001"  // The ID from the form
  }
};

// Create
await sdk.collection('products').create(productToSave);

// Update (note: recordId needs full format)
await sdk.collection('products').update(
  'myapp.products:PROD-001',  // Full reference format
  productToSave
);
```

---

## Query Building

### Basic Queries

```typescript
const sdk = await getOrInitializeSDK();
const collection = sdk.collection('products');

// Get all records
const allProducts = await collection.getAll();

// Get with filter
const activeProducts = await collection
  .filter('status', '=', 'active')
  .getAll();

// Get with multiple filters
const filteredProducts = await collection
  .filter('status', '=', 'active')
  .filter('price', '>', 100)
  .filter('quantity', '>=', 10)
  .getAll();

// Get with sorting
const sortedProducts = await collection
  .sort('price', 'desc')
  .getAll();

// Get with pagination
const paginatedProducts = await collection
  .offset(0)
  .limit(10)
  .getAll();

// Complete query chain
const results = await collection
  .filter('category', '=', 'electronics')
  .filter('status', '=', 'active')
  .sort('price', 'asc')
  .offset(20)
  .limit(10)
  .getAll();
```

### Query Operators

| Operator   | Description           | Example                                          |
| ---------- | --------------------- | ------------------------------------------------ |
| `=`        | Equal to              | `.filter('status', '=', 'active')`               |
| `!=`       | Not equal to          | `.filter('status', '!=', 'archived')`            |
| `>`        | Greater than          | `.filter('price', '>', 100)`                     |
| `<`        | Less than             | `.filter('quantity', '<', 10)`                   |
| `>=`       | Greater than or equal | `.filter('price', '>=', 50)`                     |
| `<=`       | Less than or equal    | `.filter('quantity', '<=', 100)`                 |
| `CONTAINS` | String contains       | `.filter('name', 'CONTAINS', 'laptop')`          |
| `IN`       | Value in array        | `.filter('status', 'IN', ['active', 'pending'])` |

### Advanced Query Methods

```typescript
// Get first matching record
const firstActive = await collection
  .filter('status', '=', 'active')
  .first();

// Get record count
const activeCount = await collection
  .filter('status', '=', 'active')
  .count();

// Get single record by ID
const product = await collection.getOne('myapp.products:PROD-001');

// Get with RecordID object
import { RecordIDToString } from '@machhub-dev/sdk-ts';
const productId = RecordIDToString({ Table: "myapp.products", ID: "PROD-001" });
const product = await collection.getOne(productId);
```

---

## Expanding Related Records

### What is expand()?

By default, reference fields return as RecordID. Use `expand()` to fetch the full related records.

```typescript
// WITHOUT expand - returns RecordID
const products = await sdk.collection('products').getAll();
console.log(products[0].categoryId); 
// { Table: "myapp.categories", ID: "CAT-001" }

// WITH expand - returns full object
const productsWithCategory = await sdk.collection('products').getAll({
  expand: 'categoryId'
});
console.log(productsWithCategory[0].categoryId);
// { id: "CAT-001", name: "Electronics", description: "..." }
```

### Expand Multiple Relations

```typescript
// Expand multiple fields
const orders = await sdk.collection('orders').getAll({
  expand: ['customerId', 'productId', 'warehouseId']
});

// Each expanded field now contains full record
orders.forEach(order => {
  console.log(order.customerId.name);      // Customer name
  console.log(order.productId.name);       // Product name
  console.log(order.warehouseId.location); // Warehouse location
});
```

### Expand in Queries

```typescript
// Combine expand with filters and sorting
const results = await sdk.collection('orders')
  .filter('status', '=', 'pending')
  .sort('created_dt', 'desc')
  .limit(50)
  .getAll({
    expand: ['customerId', 'productId']
  });
```

---

## Selecting Specific Fields

### Field Selection

```typescript
// Get only specific fields (reduces payload size)
const products = await sdk.collection('products').getAll({
  fields: ['id', 'name', 'price']
});

// Fields as comma-separated string
const products = await sdk.collection('products').getAll({
  fields: 'id,name,price'
});

// Combine with expand
const products = await sdk.collection('products').getAll({
  fields: ['id', 'name', 'price', 'categoryId'],
  expand: 'categoryId'
});
```

---

## CRUD Operations

### Create

```typescript
const sdk = await getOrInitializeSDK();

const newProduct = await sdk.collection('products').create({
  name: 'Wireless Mouse',
  sku: 'MOUSE-001',
  price: 29.99,
  quantity: 100,
  categoryId: {
    Table: "myapp.categories",
    ID: "CAT-002"
  }
});

console.log('Created:', newProduct);
```

### Read (Get)

```typescript
// Get all
const allProducts = await sdk.collection('products').getAll();

// Get by ID
const product = await sdk.collection('products')
  .getOne('myapp.products:PROD-001');

// Get with filters
const activeProducts = await sdk.collection('products')
  .filter('status', '=', 'active')
  .getAll();

// Get first match
const firstLowStock = await sdk.collection('products')
  .filter('quantity', '<', 10)
  .first();

// Get count
const totalProducts = await sdk.collection('products').count();
```

### Update (PATCH - Partial Update)

**IMPORTANT:** `update()` performs a PATCH operation - only provided fields are updated.

```typescript
// Update only price (other fields unchanged)
const updated = await sdk.collection('products').update(
  'myapp.products:PROD-001',
  {
    price: 34.99
  }
);

// Update multiple fields
const updated = await sdk.collection('products').update(
  'myapp.products:PROD-001',
  {
    price: 34.99,
    quantity: 75,
    status: 'active'
  }
);

// Update with reference field
const updated = await sdk.collection('products').update(
  'myapp.products:PROD-001',
  {
    categoryId: {
      Table: "myapp.categories",
      ID: "CAT-003"
    }
  }
);
```

### Delete

```typescript
// Delete by ID
await sdk.collection('products').delete('myapp.products:PROD-001');

// Note: Deletion behavior depends on collection's onDelete configuration
// - cascade: Delete related records
// - setNull: Set reference fields to null
// - restrict: Prevent deletion if references exist
```

---

## Service Pattern Examples

### Complete Domain Service

```typescript
// services/product.service.ts
import { BaseService } from './base.service';
import { getOrInitializeSDK } from './sdk.service';
import { RecordIDToString } from '@machhub-dev/sdk-ts';

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  categoryId: any;
  status: 'active' | 'inactive' | 'discontinued';
}

class ProductService extends BaseService {
  private collectionName = 'products';

  async getAllProducts(): Promise<Product[]> {
    try {
      const products = await this.getAllRecords<Product>(this.collectionName);
      
      // Extract IDs for display
      return products.map(p => ({
        ...p,
        id: this.extractId(p.id),
        categoryId: this.extractId(p.categoryId)
      }));
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  async getProductWithCategory(id: string): Promise<Product | null> {
    try {
      const sdk = await getOrInitializeSDK();
      const product = await sdk.collection(this.collectionName)
        .expand('categoryId')
        .getOne(`myapp.${this.collectionName}:${id}`);
      
      if (!product) return null;
      
      return {
        ...product,
        id: this.extractId(product.id)
      };
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  }

  async createProduct(data: Partial<Product>): Promise<Product> {
    try {
      // Convert ID to reference format
      if (data.categoryId && typeof data.categoryId === 'string') {
        data.categoryId = {
          Table: "myapp.categories",
          ID: data.categoryId
        };
      }
      
      return await this.createRecord<Product>(this.collectionName, data);
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    try {
      // Convert ID to reference format
      if (data.categoryId && typeof data.categoryId === 'string') {
        data.categoryId = {
          Table: "myapp.categories",
          ID: data.categoryId
        };
      }
      
      const fullId = `myapp.${this.collectionName}:${id}`;
      return await this.updateRecord<Product>(this.collectionName, fullId, data);
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  async deleteProduct(id: string): Promise<void> {
    try {
      const fullId = `myapp.${this.collectionName}:${id}`;
      await this.deleteRecord(this.collectionName, fullId);
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  async getLowStockProducts(threshold: number = 10): Promise<Product[]> {
    try {
      const sdk = await getOrInitializeSDK();
      return await sdk.collection(this.collectionName)
        .filter('quantity', '<', threshold)
        .filter('status', '=', 'active')
        .sort('quantity', 'asc')
        .getAll() as Product[];
    } catch (error) {
      console.error('Error fetching low stock products:', error);
      throw error;
    }
  }

  async searchProducts(query: string): Promise<Product[]> {
    try {
      const sdk = await getOrInitializeSDK();
      return await sdk.collection(this.collectionName)
        .filter('name', 'CONTAINS', query)
        .getAll() as Product[];
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }

  private extractId(value: any): string {
    if (typeof value === 'object' && value?.ID) {
      value = value.ID;
    }
    if (typeof value === 'string' && value.includes(':')) {
      return value.split(':')[1];
    }
    return value;
  }
}

export const productService = new ProductService();
```

---

## Common Patterns

### Pattern: Pagination with Total Count

```typescript
async getPaginatedProducts(page: number, pageSize: number) {
  const sdk = await getOrInitializeSDK();
  
  // Get total count
  const total = await sdk.collection('products')
    .filter('status', '=', 'active')
    .count();
  
  // Get paginated data
  const products = await sdk.collection('products')
    .filter('status', '=', 'active')
    .sort('name', 'asc')
    .offset(page * pageSize)
    .limit(pageSize)
    .getAll();
  
  return {
    products,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
}
```

### Pattern: Search with Multiple Fields

```typescript
async searchProducts(query: string) {
  const sdk = await getOrInitializeSDK();
  
  // Search in name
  const byName = await sdk.collection('products')
    .filter('name', 'CONTAINS', query)
    .getAll();
  
  // Search in SKU
  const bySku = await sdk.collection('products')
    .filter('sku', 'CONTAINS', query)
    .getAll();
  
  // Combine and deduplicate
  const combined = [...byName, ...bySku];
  const unique = combined.filter(
    (item, index, self) => 
      self.findIndex(i => extractId(i.id) === extractId(item.id)) === index
  );
  
  return unique;
}
```

### Pattern: Batch Operations

```typescript
async createMultipleProducts(products: Partial<Product>[]) {
  const results = [];
  
  for (const product of products) {
    try {
      const created = await productService.createProduct(product);
      results.push({ success: true, product: created });
    } catch (error) {
      results.push({ success: false, error, data: product });
    }
  }
  
  return results;
}
```

---

## Error Handling

### Service-Level Errors

```typescript
async getProduct(id: string): Promise<Product | null> {
  try {
    return await this.getRecordById<Product>('products', id);
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error; // Re-throw for component handling
  }
}
```

### Component-Level Errors

```typescript
try {
  const product = await productService.getProduct(id);
  if (!product) {
    toast.error('Product not found');
    return;
  }
  // Use product
} catch (error: any) {
  if (error.status === 404) {
    console.error('Product not found');
  } else if (error.status === 401) {
    window.location.href = '/login';
  } else {
    console.error('Failed to load product');
  }
}
```

---

## Templates

### Template 1: Complete CRUD Service

**File:** `src/services/user.service.ts`

**Purpose:** Full-featured service with all CRUD operations and validation

**Code:**

```typescript
// filepath: src/services/user.service.ts
import { getOrInitializeSDK } from './sdk.service';
import type { SDK } from '@machhub-dev/sdk-ts';

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'guest';
  isActive: boolean;
  profilePicture?: string;
  createdAt: Date;
  updatedAt: Date;
}

class UserService {
  private collectionName = 'users';
  private sdk: SDK | null = null;

  private async getSDK(): Promise<SDK> {
    if (!this.sdk) {
      this.sdk = await getOrInitializeSDK();
    }
    return this.sdk;
  }

  /**
   * Get all users with optional filters
   */
  async getAllUsers(filters?: {
    role?: User['role'];
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<User[]> {
    try {
      const sdk = await this.getSDK();
      let query = sdk.collection(this.collectionName);

      if (filters?.role) {
        query = query.filter('role', 'eq', filters.role);
      }

      if (filters?.isActive !== undefined) {
        query = query.filter('isActive', 'eq', filters.isActive);
      }

      if (filters?.page && filters?.limit) {
        const skip = (filters.page - 1) * filters.limit;
        query = query.skip(skip).limit(filters.limit);
      }

      const users = await query.getAll();
      return users.map(this.transformUser);
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new Error('Failed to fetch users');
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    try {
      const sdk = await this.getSDK();
      const fullId = `myapp.${this.collectionName}:${id}`;
      const user = await sdk.collection(this.collectionName).getOne(fullId);
      return user ? this.transformUser(user) : null;
    } catch (error) {
      console.error(`Error fetching user ${id}:`, error);
      return null;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const sdk = await this.getSDK();
      const users = await sdk
        .collection(this.collectionName)
        .filter('email', 'eq', email)
        .getAll();

      return users.length > 0 ? this.transformUser(users[0]) : null;
    } catch (error) {
      console.error(`Error fetching user by email ${email}:`, error);
      return null;
    }
  }

  /**
   * Create new user
   */
  async createUser(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    try {
      // Validation
      if (!data.email || !this.isValidEmail(data.email)) {
        throw new Error('Invalid email address');
      }

      // Check if email already exists
      const existing = await this.getUserByEmail(data.email);
      if (existing) {
        throw new Error('Email already exists');
      }

      const sdk = await this.getSDK();
      const created = await sdk.collection(this.collectionName).create(data);
      return this.transformUser(created);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Update user
   */
  async updateUser(
    id: string,
    updates: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<User> {
    try {
      // Validate email if provided
      if (updates.email && !this.isValidEmail(updates.email)) {
        throw new Error('Invalid email address');
      }

      const sdk = await this.getSDK();
      const fullId = `myapp.${this.collectionName}:${id}`;
      const updated = await sdk.collection(this.collectionName).update(fullId, updates);
      return this.transformUser(updated);
    } catch (error) {
      console.error(`Error updating user ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<void> {
    try {
      const sdk = await this.getSDK();
      const fullId = `myapp.${this.collectionName}:${id}`;
      await sdk.collection(this.collectionName).delete(fullId);
    } catch (error) {
      console.error(`Error deleting user ${id}:`, error);
      throw error;
    }
  }

  /**
   * Activate/deactivate user
   */
  async setUserActive(id: string, isActive: boolean): Promise<User> {
    return await this.updateUser(id, { isActive });
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role: User['role']): Promise<User[]> {
    return await this.getAllUsers({ role });
  }

  /**
   * Search users by name
   */
  async searchUsers(query: string): Promise<User[]> {
    try {
      const sdk = await this.getSDK();
      const users = await sdk
        .collection(this.collectionName)
        .filter('firstName', 'contains', query)
        .or()
        .filter('lastName', 'contains', query)
        .or()
        .filter('username', 'contains', query)
        .getAll();

      return users.map(this.transformUser);
    } catch (error) {
      console.error('Error searching users:', error);
      throw new Error('Failed to search users');
    }
  }

  /**
   * Email validation helper
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Extract ID from RecordID format
   */
  private extractId(value: any): string {
    if (typeof value === 'object' && value?.ID) {
      return value.ID;
    }
    if (typeof value === 'string' && value.includes(':')) {
      return value.split(':')[1];
    }
    return value;
  }

  /**
   * Transform user from API format to app format
   */
  private transformUser = (raw: any): User => {
    return {
      id: this.extractId(raw.id),
      email: raw.email,
      username: raw.username,
      firstName: raw.firstName,
      lastName: raw.lastName,
      role: raw.role,
      isActive: raw.isActive,
      profilePicture: raw.profilePicture,
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt)
    };
  };
}

export const userService = new UserService();
```

---

### Template 2: Query Builder Helper

**File:** `src/utils/query-builder.ts`

**Purpose:** Reusable query builder for complex filters

**Code:**

```typescript
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
```

**Usage:**

```typescript
import { QueryBuilder } from './utils/query-builder';
import { getOrInitializeSDK } from './services/sdk.service';

const sdk = await getOrInitializeSDK();

// Complex query with multiple filters
const query = QueryBuilder.build(sdk, 'products', {
  filters: [
    { field: 'price', operator: 'gte', value: 100 },
    { field: 'price', operator: 'lte', value: 500 },
    { field: 'isActive', operator: 'eq', value: true }
  ],
  sort: { field: 'price', direction: 'asc' },
  pagination: { page: 1, limit: 20 },
  expand: ['categoryId']
});

const products = await query.getAll();

// Date range query
const filters = QueryBuilder.dateRange('createdAt', 
  new Date('2024-01-01'),
  new Date('2024-12-31')
);

// Search across multiple fields
const searchFilters = QueryBuilder.search(
  ['name', 'description', 'sku'],
  'laptop'
);
```

---

### Template 3: Relationship Handler

**File:** `src/utils/relationship-handler.ts`

**Purpose:** Helper for handling RecordID relationships

**Code:**

```typescript
// filepath: src/utils/relationship-handler.ts

export interface RecordID {
  Table: string;
  ID: string;
}

export class RelationshipHandler {
  /**
   * Create RecordID reference
   */
  static createReference(table: string, id: string): RecordID {
    return {
      Table: table,
      ID: id
    };
  }

  /**
   * Create reference with app prefix
   */
  static createAppReference(collectionName: string, id: string, appName = 'myapp'): RecordID {
    return {
      Table: `${appName}.${collectionName}`,
      ID: id
    };
  }

  /**
   * Extract ID from RecordID or string
   */
  static extractId(value: any): string {
    if (typeof value === 'object' && value?.ID) {
      return value.ID;
    }
    if (typeof value === 'string' && value.includes(':')) {
      return value.split(':')[1];
    }
    return value;
  }

  /**
   * Extract table name from RecordID
   */
  static extractTable(value: any): string | null {
    if (typeof value === 'object' && value?.Table) {
      return value.Table;
    }
    if (typeof value === 'string' && value.includes(':')) {
      return value.split(':')[0];
    }
    return null;
  }

  /**
   * Check if value is a valid RecordID
   */
  static isRecordID(value: any): value is RecordID {
    return (
      typeof value === 'object' &&
      value !== null &&
      'Table' in value &&
      'ID' in value &&
      typeof value.Table === 'string' &&
      typeof value.ID === 'string'
    );
  }

  /**
   * Convert RecordID to full string format
   */
  static toFullId(recordId: RecordID): string {
    return `${recordId.Table}:${recordId.ID}`;
  }

  /**
   * Parse full ID string to RecordID
   */
  static parseFullId(fullId: string): RecordID | null {
    if (!fullId.includes(':')) return null;
    
    const [table, id] = fullId.split(':');
    return {
      Table: table,
      ID: id
    };
  }

  /**
   * Convert array of IDs to RecordID references
   */
  static toReferences(table: string, ids: string[]): RecordID[] {
    return ids.map(id => this.createReference(table, id));
  }

  /**
   * Extract IDs from array of RecordIDs
   */
  static extractIds(values: any[]): string[] {
    return values.map(value => this.extractId(value));
  }

  /**
   * Transform object with RecordID fields to plain IDs
   */
  static transformToPlainIds<T extends Record<string, any>>(
    obj: T,
    fields: (keyof T)[]
  ): T {
    const result = { ...obj };
    
    for (const field of fields) {
      if (result[field]) {
        if (Array.isArray(result[field])) {
          result[field] = this.extractIds(result[field]) as any;
        } else {
          result[field] = this.extractId(result[field]) as any;
        }
      }
    }
    
    return result;
  }

  /**
   * Transform object with plain IDs to RecordID references
   */
  static transformToReferences<T extends Record<string, any>>(
    obj: T,
    fieldMap: Record<keyof T, string>
  ): T {
    const result = { ...obj };
    
    for (const [field, table] of Object.entries(fieldMap)) {
      if (result[field]) {
        if (Array.isArray(result[field])) {
          result[field] = this.toReferences(table, result[field]) as any;
        } else {
          result[field] = this.createReference(table, result[field]) as any;
        }
      }
    }
    
    return result;
  }
}
```

**Usage:**

```typescript
import { RelationshipHandler } from './utils/relationship-handler';

// Create reference
const categoryRef = RelationshipHandler.createAppReference('categories', 'electronics');
// { Table: 'myapp.categories', ID: 'electronics' }

// Extract ID
const id = RelationshipHandler.extractId('myapp.products:laptop-001');
// 'laptop-001'

// Transform object
const product = {
  id: 'laptop-001',
  name: 'Laptop',
  categoryId: { Table: 'myapp.categories', ID: 'electronics' }
};

const plain = RelationshipHandler.transformToPlainIds(product, ['categoryId']);
// { id: 'laptop-001', name: 'Laptop', categoryId: 'electronics' }

// Batch transform
const productData = {
  name: 'New Product',
  categoryId: 'electronics',
  tags: ['tag1', 'tag2']
};

const withRefs = RelationshipHandler.transformToReferences(productData, {
  categoryId: 'myapp.categories',
  tags: 'myapp.tags'
});
```

---

### Template 4: Batch Operations Service

**File:** `src/services/batch-operations.service.ts`

**Purpose:** Service for handling batch CRUD operations

**Code:**

```typescript
// filepath: src/services/batch-operations.service.ts
import { getOrInitializeSDK } from './sdk.service';
import type { SDK } from '@machhub-dev/sdk-ts';

export interface BatchResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface BatchResults<T> {
  successful: T[];
  failed: Array<{ data: any; error: string }>;
  total: number;
  successCount: number;
  failedCount: number;
}

class BatchOperationsService {
  private sdk: SDK | null = null;

  private async getSDK(): Promise<SDK> {
    if (!this.sdk) {
      this.sdk = await getOrInitializeSDK();
    }
    return this.sdk;
  }

  /**
   * Create multiple records in batch
   */
  async batchCreate<T>(
    collectionName: string,
    records: Partial<T>[],
    options?: {
      continueOnError?: boolean;
      chunkSize?: number;
    }
  ): Promise<BatchResults<T>> {
    const results: BatchResults<T> = {
      successful: [],
      failed: [],
      total: records.length,
      successCount: 0,
      failedCount: 0
    };

    const sdk = await this.getSDK();
    const chunkSize = options?.chunkSize || 10;
    const continueOnError = options?.continueOnError !== false;

    // Process in chunks
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      const chunkPromises = chunk.map(async (record) => {
        try {
          const created = await sdk.collection(collectionName).create(record);
          return { success: true, data: created };
        } catch (error: any) {
          return {
            success: false,
            error: error.message || 'Unknown error',
            data: record
          };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);

      for (const result of chunkResults) {
        if (result.success && result.data) {
          results.successful.push(result.data);
          results.successCount++;
        } else {
          results.failed.push({
            data: result.data,
            error: result.error || 'Unknown error'
          });
          results.failedCount++;

          if (!continueOnError) {
            return results;
          }
        }
      }
    }

    return results;
  }

  /**
   * Update multiple records in batch
   */
  async batchUpdate<T>(
    collectionName: string,
    updates: Array<{ id: string; data: Partial<T> }>,
    options?: {
      continueOnError?: boolean;
      chunkSize?: number;
      appName?: string;
    }
  ): Promise<BatchResults<T>> {
    const results: BatchResults<T> = {
      successful: [],
      failed: [],
      total: updates.length,
      successCount: 0,
      failedCount: 0
    };

    const sdk = await this.getSDK();
    const chunkSize = options?.chunkSize || 10;
    const continueOnError = options?.continueOnError !== false;
    const appName = options?.appName || 'myapp';

    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);
      const chunkPromises = chunk.map(async ({ id, data }) => {
        try {
          const fullId = `${appName}.${collectionName}:${id}`;
          const updated = await sdk.collection(collectionName).update(fullId, data);
          return { success: true, data: updated };
        } catch (error: any) {
          return {
            success: false,
            error: error.message || 'Unknown error',
            data: { id, ...data }
          };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);

      for (const result of chunkResults) {
        if (result.success && result.data) {
          results.successful.push(result.data);
          results.successCount++;
        } else {
          results.failed.push({
            data: result.data,
            error: result.error || 'Unknown error'
          });
          results.failedCount++;

          if (!continueOnError) {
            return results;
          }
        }
      }
    }

    return results;
  }

  /**
   * Delete multiple records in batch
   */
  async batchDelete(
    collectionName: string,
    ids: string[],
    options?: {
      continueOnError?: boolean;
      chunkSize?: number;
      appName?: string;
    }
  ): Promise<BatchResults<{ id: string }>> {
    const results: BatchResults<{ id: string }> = {
      successful: [],
      failed: [],
      total: ids.length,
      successCount: 0,
      failedCount: 0
    };

    const sdk = await this.getSDK();
    const chunkSize = options?.chunkSize || 10;
    const continueOnError = options?.continueOnError !== false;
    const appName = options?.appName || 'myapp';

    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const chunkPromises = chunk.map(async (id) => {
        try {
          const fullId = `${appName}.${collectionName}:${id}`;
          await sdk.collection(collectionName).delete(fullId);
          return { success: true, data: { id } };
        } catch (error: any) {
          return {
            success: false,
            error: error.message || 'Unknown error',
            data: { id }
          };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);

      for (const result of chunkResults) {
        if (result.success && result.data) {
          results.successful.push(result.data);
          results.successCount++;
        } else {
          results.failed.push({
            data: result.data,
            error: result.error || 'Unknown error'
          });
          results.failedCount++;

          if (!continueOnError) {
            return results;
          }
        }
      }
    }

    return results;
  }
}

export const batchOperationsService = new BatchOperationsService();
```

**Usage:**

```typescript
import { batchOperationsService } from './services/batch-operations.service';

// Batch create
const newProducts = [
  { name: 'Product 1', price: 10 },
  { name: 'Product 2', price: 20 },
  { name: 'Product 3', price: 30 }
];

const createResults = await batchOperationsService.batchCreate('products', newProducts, {
  chunkSize: 10,
  continueOnError: true
});

console.log(`Created: ${createResults.successCount}, Failed: ${createResults.failedCount}`);

// Batch update
const updates = [
  { id: 'prod-1', data: { price: 15 } },
  { id: 'prod-2', data: { price: 25 } }
];

const updateResults = await batchOperationsService.batchUpdate('products', updates);

// Batch delete
const idsToDelete = ['prod-1', 'prod-2', 'prod-3'];
const deleteResults = await batchOperationsService.batchDelete('products', idsToDelete);
```

---

## Collections Checklist

When working with collections, ensure:

- [ ] **RecordID format understood** - Use `{ Table, ID }` for references
- [ ] **extractId() helper** implemented for display
- [ ] **Reference fields converted** when creating/updating
- [ ] **Full RecordID format** used for update/delete operations
- [ ] **expand() used** when full related records needed
- [ ] **PATCH behavior understood** - update() only modifies provided fields
- [ ] **Query operators correct** - Use proper operator for each filter
- [ ] **Error handling** implemented with try-catch
- [ ] **Type safety** - Define interfaces for all collection types
- [ ] **Service layer** used (no direct SDK in components)

---

## Best Practices

1. ✅ **Always use services** - Never access SDK directly from components
2. ✅ **Extract IDs for display** - Use helper function to extract clean IDs
3. ✅ **Convert for save** - Convert IDs to reference format before create/update
4. ✅ **Use expand() wisely** - Only expand when you need full related data
5. ✅ **Select fields** - Use `fields` option to reduce payload size
6. ✅ **Handle RecordID formats** - Support both nested object and string formats
7. ✅ **Use RecordID utilities** - Leverage RecordIDToString and StringToRecordID
8. ✅ **Understand PATCH** - Remember update() is partial, not full replacement

---

## Next Steps

After mastering collections:
1. **Handle file uploads** → See `machhub-sdk-file-handling`
2. **Implement authentication** → See `machhub-sdk-authentication`
3. **Add real-time features** → See `machhub-sdk-realtime`
4. **Query historical data** → See `machhub-sdk-advanced`

---

## Resources

- **MACHHUB SDK Docs**: https://docs.machhub.dev
- **Initialization Guide**: See `machhub-sdk-initialization`
- **Architecture Patterns**: See `machhub-sdk-architecture`
