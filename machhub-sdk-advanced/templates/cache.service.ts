import { getOrInitializeSDK } from './sdk.service';

const sdk = await getOrInitializeSDK();

const history = await sdk.historian.query(
  `SELECT time::floor(time, 1h) AS hour, math::mean(value) AS avg_value
   FROM historian WHERE topic = 'temperature/room1'
   AND time >= '2024-01-01T00:00:00Z' AND time <= '2024-01-02T00:00:00Z'
   GROUP BY hour ORDER BY hour ASC`
);

console.log(history);
// [
//   { hour: '2024-01-01T00:00:00Z', avg_value: 22.5 },
//   { hour: '2024-01-01T01:00:00Z', avg_value: 23.1 },
//   ...
// ]
```

### Query Parameter

`query(SurrealQL: string): Promise<any>`

Pass a raw SurrealQL string to query historian time-series data. The historian table stores per-topic readings with `topic`, `value`, and `time` fields.

### SurrealDB Aggregation Functions

| Function         | Description        | Use Case               |
| ---------------- | ------------------ | ---------------------- |
| `math::mean()`   | Average value      | Temperature trends     |
| `math::min()`    | Minimum value      | Find lowest readings   |
| `math::max()`    | Maximum value      | Peak detection         |
| `math::sum()`    | Sum of values      | Total production count |
| `count()`        | Number of readings | Data availability      |

---

## Historian Examples

### Last 24 Hours Average

```typescript
const now = new Date();
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

const data = await sdk.historian.query(
  `SELECT time::floor(time, 1h) AS hour, math::mean(value) AS avg_value
   FROM historian WHERE topic = 'temperature/room1'
   AND time >= '${yesterday.toISOString()}' AND time <= '${now.toISOString()}'
   GROUP BY hour ORDER BY hour ASC`
);
```

### Multiple Sensors

```typescript
const data = await sdk.historian.query(
  `SELECT topic, time::floor(time, 30m) AS period, math::mean(value) AS avg_value
   FROM historian WHERE topic IN ['temperature/room1', 'temperature/room2', 'temperature/room3']
   AND time >= '2024-01-01T00:00:00Z' AND time <= '2024-01-02T00:00:00Z'
   GROUP BY topic, period ORDER BY period ASC`
);
```

### Production Metrics

```typescript
// Get hourly production counts
const production = await sdk.historian.query(
  `SELECT time::floor(time, 1h) AS hour, math::sum(value) AS total_count
   FROM historian WHERE topic = 'production/line1/count'
   AND time >= '2024-01-01T08:00:00Z' AND time <= '2024-01-01T17:00:00Z'
   GROUP BY hour ORDER BY hour ASC`
);
```

---

## Historian Service Example

```typescript
// services/analytics.service.ts
import { getOrInitializeSDK } from './sdk.service';

interface TrendData {
  timestamp: string;
  value: number;
}

class AnalyticsService {
  async getProductionTrends(
    startDate: Date,
    endDate: Date
  ): Promise<TrendData[]> {
    try {
      const sdk = await getOrInitializeSDK();

      const data = await sdk.historian.query(
        `SELECT time::floor(time, 1h) AS hour, math::mean(value) AS avg_value
         FROM historian WHERE topic = 'production/rate'
         AND time >= '${startDate.toISOString()}' AND time <= '${endDate.toISOString()}'
         GROUP BY hour ORDER BY hour ASC`
      );

      return data;
    } catch (error) {
      console.error('Error fetching production trends:', error);
      throw error;
    }
  }

  async getTemperatureStats(
    sensor: string,
    hours: number = 24
  ) {
    try {
      const sdk = await getOrInitializeSDK();
      const now = new Date();
      const start = new Date(now.getTime() - hours * 60 * 60 * 1000);

      // Get average
      const avgData = await sdk.historian.query(
        `SELECT time::floor(time, 1h) AS hour, math::mean(value) AS avg_value
         FROM historian WHERE topic = '${sensor}'
         AND time >= '${start.toISOString()}' AND time <= '${now.toISOString()}'
         GROUP BY hour ORDER BY hour ASC`
      );

      // Get min
      const minData = await sdk.historian.query(
        `SELECT time::floor(time, 1h) AS hour, math::min(value) AS min_value
         FROM historian WHERE topic = '${sensor}'
         AND time >= '${start.toISOString()}' AND time <= '${now.toISOString()}'
         GROUP BY hour ORDER BY hour ASC`
      );

      // Get max
      const maxData = await sdk.historian.query(
        `SELECT time::floor(time, 1h) AS hour, math::max(value) AS max_value
         FROM historian WHERE topic = '${sensor}'
         AND time >= '${start.toISOString()}' AND time <= '${now.toISOString()}'
         GROUP BY hour ORDER BY hour ASC`
      );

      const average = avgData.reduce((sum, d) => sum + d.avg_value, 0) / avgData.length;
      const minimum = Math.min(...minData.map(d => d.min_value));
      const maximum = Math.max(...maxData.map(d => d.max_value));

      return { average, minimum, maximum, data: avgData };
    } catch (error) {
      console.error('Error fetching temperature stats:', error);
      throw error;
    }
  }

  async compareMultipleSensors(
    sensors: string[],
    hours: number = 24
  ) {
    try {
      const sdk = await getOrInitializeSDK();
      const now = new Date();
      const start = new Date(now.getTime() - hours * 60 * 60 * 1000);

      const data = await sdk.historian.query(
        `SELECT topic, time::floor(time, 30m) AS period, math::mean(value) AS avg_value
         FROM historian WHERE topic IN ${JSON.stringify(sensors)}
         AND time >= '${start.toISOString()}' AND time <= '${now.toISOString()}'
         GROUP BY topic, period ORDER BY period ASC`
      );

      return data;
    } catch (error) {
      console.error('Error comparing sensors:', error);
      throw error;
    }
  }
}

export const analyticsService = new AnalyticsService();
```

---

## Remote Functions

### Invoke Function

```typescript
const sdk = await getOrInitializeSDK();

// Invoke remote function with parameters
const result = await sdk.function.invoke('functionName', {
  param1: 'value1',
  param2: 123,
  param3: true
});

console.log('Function result:', result);
```

### Function Examples

```typescript
// Send email notification
await sdk.function.invoke('sendEmail', {
  to: 'user@example.com',
  subject: 'Alert',
  body: 'Temperature exceeded threshold'
});

// Process data
const processed = await sdk.function.invoke('processData', {
  source: 'sensors',
  operation: 'aggregate',
  timeRange: '1h'
});

// Trigger action
await sdk.function.invoke('triggerAction', {
  action: 'restart_service',
  service: 'data_collector'
});
```

---

## Workflows (Flows)

### Execute Workflow

```typescript
const sdk = await getOrInitializeSDK();

// Execute workflow with input data
const result = await sdk.flow.execute('workflowName', {
  input: 'data',
  config: {
    mode: 'production',
    notify: true
  }
});

console.log('Workflow result:', result);
```

### Workflow Examples

```typescript
// Data processing workflow
const result = await sdk.flow.execute('data_processing_flow', {
  source: 'sensor_readings',
  destination: 'processed_data',
  filters: {
    quality: 'good',
    status: 'active'
  }
});

// Report generation workflow
await sdk.flow.execute('generate_report', {
  reportType: 'daily',
  format: 'pdf',
  recipients: ['manager@example.com']
});

// Automated maintenance workflow
await sdk.flow.execute('maintenance_check', {
  equipment: ['machine1', 'machine2'],
  checkType: 'preventive'
});
```

---

## Workflow Service Example

```typescript
// services/workflow.service.ts
import { getOrInitializeSDK } from './sdk.service';

class WorkflowService {
  async processData(
    sourceCollection: string,
    destinationCollection: string,
    filters?: any
  ) {
    try {
      const sdk = await getOrInitializeSDK();

      return await sdk.flow.execute('data_processing_flow', {
        source: sourceCollection,
        destination: destinationCollection,
        filters: filters || {}
      });
    } catch (error) {
      console.error('Error processing data:', error);
      throw error;
    }
  }

  async generateReport(
    reportType: string,
    parameters: any
  ) {
    try {
      const sdk = await getOrInitializeSDK();

      return await sdk.flow.execute('generate_report', {
        reportType,
        ...parameters
      });
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  async invokeFunction(
    functionName: string,
    parameters: any
  ) {
    try {
      const sdk = await getOrInitializeSDK();
      return await sdk.function.invoke(functionName, parameters);
    } catch (error) {
      console.error(`Error invoking function ${functionName}:`, error);
      throw error;
    }
  }
}

export const workflowService = new WorkflowService();
```

---

## Complete Analytics Example

```typescript
// Dashboard with historical data
import { analyticsService } from './services';

let temperatureData = [];
let stats = null;

async function loadDashboardData() {
  // Get last 24 hours of temperature data
  const data = await analyticsService.getProductionTrends(
    new Date(Date.now() - 24 * 60 * 60 * 1000),
    new Date()
  );

  temperatureData = data;

  // Get statistics
  stats = await analyticsService.getTemperatureStats(
    'temperature/room1',
    24
  );
  
  // Update UI with data
  console.log('Dashboard data loaded:', { temperatureData, stats });
}

// Call on page load
loadDashboardData();
```

---

## Best Practices

### Historian

1. âœ… **Use for time-series** - Don't store all sensor data in Collections
2. âœ… **Choose appropriate intervals** - Balance detail vs performance
3. âœ… **Limit time ranges** - Query only what you need
4. âœ… **Use aggregation** - Reduce data volume for large ranges
5. âœ… **Cache results** - Store frequently accessed historical data

### Functions & Workflows

1. âœ… **Error handling** - Wrap invocations in try-catch
2. âœ… **Parameter validation** - Validate inputs before invoking
3. âœ… **Timeout handling** - Consider long-running operations
4. âœ… **Logging** - Log function/workflow executions
5. âœ… **Idempotency** - Design functions to be safely retriable

---

## Templates

### Template 1: Historian Service

**File:** `src/services/historian.service.ts`

**Purpose:** Service for querying time-series data with aggregations

**Code:**

```typescript
// filepath: src/services/historian.service.ts
import { getOrInitializeSDK } from './sdk.service';
import type { SDK } from '@machhub-dev/sdk-ts';

export type AggregationType = 'avg' | 'min' | 'max' | 'sum';

export interface HistorianDataPoint {
  hour: string;
  value: number;
  [key: string]: any;
}

class HistorianService {
  private sdk: SDK | null = null;

  private async getSDK(): Promise<SDK> {
    if (!this.sdk) {
      this.sdk = await getOrInitializeSDK();
    }
    return this.sdk;
  }

  private aggFn(aggregation: AggregationType): string {
    const map = { avg: 'math::mean', min: 'math::min', max: 'math::max', sum: 'math::sum' };
    return map[aggregation];
  }

  /**
   * Execute a raw SurrealQL query against historian data
   */
  async query(surrealQL: string): Promise<any[]> {
    try {
      const sdk = await this.getSDK();
      return await sdk.historian.query(surrealQL);
    } catch (error) {
      console.error('Historian query failed:', error);
      throw error;
    }
  }

  /**
   * Get aggregated values over time period
   */
  async getAverage(
    topic: string,
    startTime: Date,
    endTime: Date,
    interval: string = '1h'
  ): Promise<HistorianDataPoint[]> {
    return this.query(
      `SELECT time::floor(time, ${interval}) AS hour, math::mean(value) AS avg_value
       FROM historian WHERE topic = '${topic}'
       AND time >= '${startTime.toISOString()}' AND time <= '${endTime.toISOString()}'
       GROUP BY hour ORDER BY hour ASC`
    );
  }

  /**
   * Get min/max values
   */
  async getMinMax(
    topic: string,
    startTime: Date,
    endTime: Date
  ): Promise<{ min: number; max: number }> {
    const sdk = await this.getSDK();
    const [minData, maxData] = await Promise.all([
      sdk.historian.query(
        `SELECT math::min(value) AS min_value FROM historian
         WHERE topic = '${topic}'
         AND time >= '${startTime.toISOString()}' AND time <= '${endTime.toISOString()}'`
      ),
      sdk.historian.query(
        `SELECT math::max(value) AS max_value FROM historian
         WHERE topic = '${topic}'
         AND time >= '${startTime.toISOString()}' AND time <= '${endTime.toISOString()}'`
      )
    ]);

    return {
      min: minData[0]?.min_value ?? 0,
      max: maxData[0]?.max_value ?? 0
    };
  }

  /**
   * Get data for the last N hours
   */
  async getLastHours(
    topic: string,
    hours: number,
    aggregation: AggregationType = 'avg',
    interval: string = '1h'
  ): Promise<HistorianDataPoint[]> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

    return this.query(
      `SELECT time::floor(time, ${interval}) AS hour, ${this.aggFn(aggregation)}(value) AS value
       FROM historian WHERE topic = '${topic}'
       AND time >= '${startTime.toISOString()}' AND time <= '${endTime.toISOString()}'
       GROUP BY hour ORDER BY hour ASC`
    );
  }

  /**
   * Get data for today
   */
  async getToday(
    topic: string,
    aggregation: AggregationType = 'avg'
  ): Promise<HistorianDataPoint[]> {
    const now = new Date();
    const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);

    return this.query(
      `SELECT time::floor(time, 1h) AS hour, ${this.aggFn(aggregation)}(value) AS value
       FROM historian WHERE topic = '${topic}'
       AND time >= '${startTime.toISOString()}' AND time <= '${endTime.toISOString()}'
       GROUP BY hour ORDER BY hour ASC`
    );
  }

  /**
   * Compare two time periods
   */
  async comparePeriods(
    topic: string,
    period1Start: Date,
    period1End: Date,
    period2Start: Date,
    period2End: Date,
    aggregation: AggregationType = 'avg'
  ): Promise<{
    period1: HistorianDataPoint[];
    period2: HistorianDataPoint[];
  }> {
    const sdk = await this.getSDK();
    const aggFn = this.aggFn(aggregation);

    const [period1, period2] = await Promise.all([
      sdk.historian.query(
        `SELECT time::floor(time, 1h) AS hour, ${aggFn}(value) AS value
         FROM historian WHERE topic = '${topic}'
         AND time >= '${period1Start.toISOString()}' AND time <= '${period1End.toISOString()}'
         GROUP BY hour ORDER BY hour ASC`
      ),
      sdk.historian.query(
        `SELECT time::floor(time, 1h) AS hour, ${aggFn}(value) AS value
         FROM historian WHERE topic = '${topic}'
         AND time >= '${period2Start.toISOString()}' AND time <= '${period2End.toISOString()}'
         GROUP BY hour ORDER BY hour ASC`
      )
    ]);

    return { period1, period2 };
  }
}

export const historianService = new HistorianService();
```

**Usage:**

```typescript
import { historianService } from './services/historian.service';

// Get average temperature for last 24 hours
const data = await historianService.getLastHours(
  'temperature/room1',
  24,
  'avg',
  '1h'
);

// Get today's data
const todayData = await historianService.getToday('temperature/room1', 'avg');

// Get min/max values
const { min, max } = await historianService.getMinMax(
  'temperature/room1',
  new Date('2024-01-01'),
  new Date('2024-01-31')
);

// Compare two weeks
const comparison = await historianService.comparePeriods(
  'temperature/room1',
  new Date('2024-01-01'),
  new Date('2024-01-07'),
  new Date('2024-01-08'),
  new Date('2024-01-14'),
  'avg'
);
```

---

### Template 2: Function Invocation Service

**File:** `src/services/function.service.ts`

**Purpose:** Service for invoking MACHHUB functions and workflows

**Code:**

```typescript
// filepath: src/services/function.service.ts
import { getOrInitializeSDK } from './sdk.service';
import type { SDK } from '@machhub-dev/sdk-ts';

export interface FunctionParams {
  [key: string]: any;
}

export interface FunctionResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime?: number;
}

class FunctionService {
  private sdk: SDK | null = null;

  private async getSDK(): Promise<SDK> {
    if (!this.sdk) {
      this.sdk = await getOrInitializeSDK();
    }
    return this.sdk;
  }

  /**
   * Invoke a function
   */
  async invoke(
    functionName: string,
    params: FunctionParams = {}
  ): Promise<FunctionResult> {
    const startTime = Date.now();

    try {
      // Validate parameters
      this.validateParams(params);

      const sdk = await this.getSDK();
      const result = await sdk.function.invoke(functionName, params);

      return {
        success: true,
        result,
        executionTime: Date.now() - startTime
      };
    } catch (error: any) {
      console.error(`Function ${functionName} failed:`, error);
      
      return {
        success: false,
        error: error.message || 'Function execution failed',
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Invoke workflow
   */
  async invokeWorkflow(
    workflowName: string,
    inputs: FunctionParams = {}
  ): Promise<FunctionResult> {
    const startTime = Date.now();

    try {
      this.validateParams(inputs);

      const sdk = await this.getSDK();
      const result = await sdk.workflow.invoke(workflowName, inputs);

      return {
        success: true,
        result,
        executionTime: Date.now() - startTime
      };
    } catch (error: any) {
      console.error(`Workflow ${workflowName} failed:`, error);
      
      return {
        success: false,
        error: error.message || 'Workflow execution failed',
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Invoke function with retry logic
   */
  async invokeWithRetry(
    functionName: string,
    params: FunctionParams = {},
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<FunctionResult> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.invoke(functionName, params);
        
        if (result.success) {
          return result;
        }

        lastError = result.error;
      } catch (error) {
        lastError = error;
      }

      if (attempt < maxRetries) {
        await this.delay(retryDelay * attempt);
      }
    }

    return {
      success: false,
      error: `Failed after ${maxRetries} attempts: ${lastError}`
    };
  }

  /**
   * Invoke multiple functions in parallel
   */
  async invokeParallel(
    functions: Array<{ name: string; params?: FunctionParams }>
  ): Promise<FunctionResult[]> {
    const promises = functions.map(({ name, params }) =>
      this.invoke(name, params)
    );

    return await Promise.all(promises);
  }

  /**
   * Invoke functions in sequence
   */
  async invokeSequential(
    functions: Array<{ name: string; params?: FunctionParams }>
  ): Promise<FunctionResult[]> {
    const results: FunctionResult[] = [];

    for (const { name, params } of functions) {
      const result = await this.invoke(name, params);
      results.push(result);

      // Stop if any function fails
      if (!result.success) {
        break;
      }
    }

    return results;
  }

  /**
   * Get function list
   */
  async getFunctions(): Promise<string[]> {
    try {
      const sdk = await this.getSDK();
      return await sdk.function.list();
    } catch (error) {
      console.error('Failed to get functions:', error);
      return [];
    }
  }

  /**
   * Get workflow list
   */
  async getWorkflows(): Promise<string[]> {
    try {
      const sdk = await this.getSDK();
      return await sdk.workflow.list();
    } catch (error) {
      console.error('Failed to get workflows:', error);
      return [];
    }
  }

  /**
   * Validate parameters
   */
  private validateParams(params: FunctionParams): void {
    if (typeof params !== 'object' || params === null) {
      throw new Error('Parameters must be an object');
    }

    // Add custom validation logic here
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const functionService = new FunctionService();
```

**Usage:**

```typescript
import { functionService } from './services/function.service';

// Invoke function
const result = await functionService.invoke('calculateTotal', {
  items: [10, 20, 30]
});

if (result.success) {
  console.log('Result:', result.result);
  console.log('Execution time:', result.executionTime, 'ms');
}

// Invoke workflow
const workflowResult = await functionService.invokeWorkflow('processOrder', {
  orderId: 'order-123',
  customerId: 'customer-456'
});

// Invoke with retry
const retryResult = await functionService.invokeWithRetry(
  'unreliableFunction',
  { data: 'test' },
  3, // max retries
  1000 // delay between retries
);

// Invoke multiple functions in parallel
const parallelResults = await functionService.invokeParallel([
  { name: 'function1', params: { a: 1 } },
  { name: 'function2', params: { b: 2 } },
  { name: 'function3', params: { c: 3 } }
]);
```

---

### Template 3: Cache Service

**File:** `src/services/cache.service.ts`

**Purpose:** Simple in-memory cache for API results

**Code:**

```typescript
// filepath: src/services/cache.service.ts

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
}

interface CacheEntry<T> {
  value: T;
  expires: number;
}

class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  private maxSize = 100;

  constructor(options: CacheOptions = {}) {
    if (options.ttl) this.defaultTTL = options.ttl;
    if (options.maxSize) this.maxSize = options.maxSize;
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    // Enforce max size
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const expires = Date.now() + (ttl || this.defaultTTL);

    this.cache.set(key, {
      value,
      expires
    });
  }

  /**
   * Delete value from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const value = this.get(key);
    return value !== null;
  }

  /**
   * Get or set (fetch if not in cache)
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Create cache key from parts
   */
  static createKey(...parts: (string | number)[]): string {
    return parts.join(':');
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; keys: string[] } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Clean expired entries
   */
  cleanup(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }
}

export const cacheService = new CacheService({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 100
});

// Run cleanup every minute
setInterval(() => cacheService.cleanup(), 60 * 1000);
