# MACHHUB SDK Advanced Templates

Templates for historian queries, function invocation, caching, and data transformation.

## Templates

### 1. `historian.service.ts`
**Time-series data queries**
- Aggregation support (avg, min, max, sum, count)
- Time range queries
- Period comparisons
- Interval-based queries
- Quality indicators

### 2. `function.service.ts`
**Function and workflow invocation**
- Function execution
- Workflow execution
- Retry logic
- Parallel/sequential execution
- Parameter validation

### 3. `cache.service.ts`
**In-memory caching**
- TTL-based expiration
- Size limits
- Get-or-fetch pattern
- Auto-cleanup
- Cache statistics

### 4. `data-transform.ts`
**Data transformation utilities**
- Group by key
- Sort and filter
- Pagination
- Statistics calculation
- Object flattening

## Usage

### Historian Queries

```typescript
import { historianService } from './services/historian.service';

// Get average for last 24 hours
const data = await historianService.getLastHours(
  'temperature/room1',
  24,
  'avg',
  '1h'
);

// Compare periods
const comparison = await historianService.comparePeriods(
  'temperature/room1',
  new Date('2024-01-01'),
  new Date('2024-01-07'),
  new Date('2024-01-08'),
  new Date('2024-01-14'),
  'avg'
);
```

### Function Invocation

```typescript
import { functionService } from './services/function.service';

// Invoke function
const result = await functionService.invoke('calculateTotal', {
  items: [10, 20, 30]
});

// Invoke with retry
const retryResult = await functionService.invokeWithRetry(
  'unreliableFunction',
  { data: 'test' },
  3, // max retries
  1000 // delay
);
```

### Caching

```typescript
import { cacheService } from './services/cache.service';

// Get or fetch
const products = await cacheService.getOrSet(
  'products:all',
  () => productService.getAllProducts(),
  5 * 60 * 1000 // 5 minutes
);
```

### Data Transformation

```typescript
import { DataTransform } from './utils/data-transform';

// Group by category
const grouped = DataTransform.groupBy(products, 'category');

// Sort by price
const sorted = DataTransform.sortBy(products, 'price', 'desc');

// Paginate
const page = DataTransform.paginate(products, 1, 20);
```

## See Also

- [machhub-sdk-initialization](../machhub-sdk-initialization/) - SDK setup
- [machhub-sdk-collections](../machhub-sdk-collections/) - Collection operations
