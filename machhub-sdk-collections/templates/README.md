# MACHHUB SDK Collections Templates

Templates for working with MACHHUB collections, queries, relationships, and batch operations.

## Templates

### 1. `user.service.ts`
**Complete CRUD service with validation**
- Complete entity management pattern
- Input validation pattern
- Attribute-based filtering
- Search functionality
- Data transformation

### 2. `query-builder.ts`
**Reusable query builder utility**
- Complex filter building
- Date range queries
- Search across multiple fields
- IN operator support
- Pagination and sorting

### 3. `relationship-handler.ts`
**RecordID relationship utilities**
- Create RecordID references
- Extract IDs from RecordIDs
- Transform between formats
- Batch transformations
- Validation helpers

### 4. `batch-operations.service.ts`
**Batch CRUD operations**
- Batch create with chunking
- Batch update
- Batch delete
- Error handling per operation
- Progress tracking

## Usage

### Query Builder Example

```typescript
import { QueryBuilder } from './utils/query-builder';
import { getOrInitializeSDK } from './services/sdk.service';

const sdk = await getOrInitializeSDK();

const query = QueryBuilder.build(sdk, 'items', {
  filters: [
    { field: 'amount', operator: 'gte', value: 100 },
    { field: 'state', operator: 'eq', value: 'active' },
    { field: 'name', operator: 'contains', value: 'sensor', or: true }
  ],
  sort: { field: 'amount', direction: 'asc' },
  pagination: { page: 1, limit: 20 }
});

const items = await query.getAll();
```

### Relationship Handler Example

```typescript
import { RelationshipHandler } from './utils/relationship-handler';

// Create reference
const relatedRef = RelationshipHandler.createAppReference('relatedCollection', 'REL-001');

// Extract ID
const id = RelationshipHandler.extractId('myapp.items:ITEM-001');

// Transform object
const plain = RelationshipHandler.transformToPlainIds(item, ['relatedId']);
```

## See Also

- [machhub-sdk-architecture](../machhub-sdk-architecture/) - Service patterns
- [machhub-sdk-initialization](../machhub-sdk-initialization/) - SDK setup
