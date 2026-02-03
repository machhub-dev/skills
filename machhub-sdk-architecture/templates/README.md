# MACHHUB SDK Architecture Templates

Copy-paste ready templates for implementing service layer architecture with the MACHHUB TypeScript SDK.

## Templates

### 1. `base.service.ts`
**Base service class with common CRUD operations**
- Pagination support
- Filtering and sorting
- Field selection
- Relationship expansion
- RecordID handling

### 2. `product.service.ts`
**Complete domain service example**
- Extends BaseService
- Full CRUD operations
- Business logic methods
- Data transformation
- Relationship handling

### 3. `index.ts`
**Service barrel export**
- Centralized exports for all services
- Type exports
- Clean import paths

### 4. `order.service.ts`
**Service with complex relationships**
- Multiple relationship handling
- Nested RecordID references
- Order number generation
- Status management

## Usage

Copy the desired template file to your project and customize:

```typescript
import { productService } from './services/product.service';

// Get all products
const products = await productService.getAllProducts({
  pagination: { page: 1, limit: 20 },
  sort: { field: 'name', direction: 'asc' }
});

// Create product
const newProduct = await productService.createProduct({
  name: 'Laptop Pro',
  sku: 'LAP-001',
  price: 1299.99,
  stock: 50,
  isActive: true,
  categoryId: 'electronics'
});
```

## See Also

- [machhub-sdk-initialization](../machhub-sdk-initialization/) - SDK setup
- [machhub-sdk-collections](../machhub-sdk-collections/) - Collection operations
