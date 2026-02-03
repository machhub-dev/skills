import { getOrInitializeSDK } from './sdk.service';

const sdk = await getOrInitializeSDK();

const history = await sdk.historian.query({
  tagNames: ['temperature/room1'],
  startTime: '2024-01-01T00:00:00Z',
  endTime: '2024-01-02T00:00:00Z',
  interval: '1h',
  aggregation: 'avg'
});

console.log(history);
// [
//   { timestamp: '2024-01-01T00:00:00Z', value: 22.5 },
//   { timestamp: '2024-01-01T01:00:00Z', value: 23.1 },
//   ...
// ]
```

### Query Parameters

```typescript
interface HistorianQuery {
  tagNames: string[];              // Tags to query
  startTime: string;                // ISO 8601 format
  endTime: string;                  // ISO 8601 format
  interval?: string;                // '1m', '5m', '1h', '1d'
  aggregation?: 'avg' | 'min' | 'max' | 'sum' | 'count';
}
```

### Aggregation Types

| Type    | Description        | Use Case               |
| ------- | ------------------ | ---------------------- |
| `avg`   | Average value      | Temperature trends     |
| `min`   | Minimum value      | Find lowest readings   |
| `max`   | Maximum value      | Peak detection         |
| `sum`   | Sum of values      | Total production count |
| `count` | Number of readings | Data availability      |

---

## Historian Examples

### Last 24 Hours Average

```typescript
const now = new Date();
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

const data = await sdk.historian.query({
  tagNames: ['temperature/room1'],
  startTime: yesterday.toISOString(),
  endTime: now.toISOString(),
  interval: '1h',
  aggregation: 'avg'
});
```

### Multiple Sensors

```typescript
const data = await sdk.historian.query({
  tagNames: [
    'temperature/room1',
    'temperature/room2',
    'temperature/room3'
  ],
  startTime: '2024-01-01T00:00:00Z',
  endTime: '2024-01-02T00:00:00Z',
  interval: '30m',
  aggregation: 'avg'
});
```

### Production Metrics

```typescript
// Get hourly production counts
const production = await sdk.historian.query({
  tagNames: ['production/line1/count'],
  startTime: '2024-01-01T08:00:00Z',
  endTime: '2024-01-01T17:00:00Z',
  interval: '1h',
  aggregation: 'sum'
});
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

      const data = await sdk.historian.query({
        tagNames: ['production/rate'],
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        interval: '1h',
        aggregation: 'avg'
      });

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
      const avgData = await sdk.historian.query({
        tagNames: [sensor],
        startTime: start.toISOString(),
        endTime: now.toISOString(),
        interval: '1h',
        aggregation: 'avg'
      });

      // Get min
      const minData = await sdk.historian.query({
        tagNames: [sensor],
        startTime: start.toISOString(),
        endTime: now.toISOString(),
        interval: '1h',
        aggregation: 'min'
      });

      // Get max
      const maxData = await sdk.historian.query({
        tagNames: [sensor],
        startTime: start.toISOString(),
        endTime: now.toISOString(),
        interval: '1h',
        aggregation: 'max'
      });

      const average = avgData.reduce((sum, d) => sum + d.value, 0) / avgData.length;
      const minimum = Math.min(...minData.map(d => d.value));
      const maximum = Math.max(...maxData.map(d => d.value));

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

      const data = await sdk.historian.query({
        tagNames: sensors,
        startTime: start.toISOString(),
        endTime: now.toISOString(),
        interval: '30m',
        aggregation: 'avg'
      });

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

export type AggregationType = 'avg' | 'min' | 'max' | 'sum' | 'count';

export interface HistorianQuery {
  tagName: string;
  startTime: Date;
  endTime: Date;
  aggregation?: AggregationType;
  interval?: string; // e.g., '1h', '15m', '1d'
}

export interface HistorianDataPoint {
  timestamp: Date;
  value: number;
  quality?: 'good' | 'bad' | 'uncertain';
}

class HistorianService {
  private sdk: SDK | null = null;

  private async getSDK(): Promise<SDK> {
    if (!this.sdk) {
      this.sdk = await getOrInitializeSDK();
    }
    return this.sdk;
  }

  /**
   * Query historian data
   */
  async query(options: HistorianQuery): Promise<HistorianDataPoint[]> {
    try {
      const sdk = await this.getSDK();
      
      let query = sdk.historian
        .tag(options.tagName)
        .from(options.startTime)
        .to(options.endTime);

      if (options.aggregation) {
        query = query.aggregate(options.aggregation, options.interval || '1h');
      }

      const results = await query.execute();
      
      return results.map((point: any) => ({
        timestamp: new Date(point.timestamp),
        value: point.value,
        quality: point.quality || 'good'
      }));
    } catch (error) {
      console.error('Historian query failed:', error);
      throw error;
    }
  }

  /**
   * Get average value over time period
   */
  async getAverage(
    tagName: string,
    startTime: Date,
    endTime: Date,
    interval: string = '1h'
  ): Promise<HistorianDataPoint[]> {
    return await this.query({
      tagName,
      startTime,
      endTime,
      aggregation: 'avg',
      interval
    });
  }

  /**
   * Get min/max values
   */
  async getMinMax(
    tagName: string,
    startTime: Date,
    endTime: Date
  ): Promise<{ min: number; max: number }> {
    const [minData, maxData] = await Promise.all([
      this.query({
        tagName,
        startTime,
        endTime,
        aggregation: 'min'
      }),
      this.query({
        tagName,
        startTime,
        endTime,
        aggregation: 'max'
      })
    ]);

    return {
      min: minData.length > 0 ? minData[0].value : 0,
      max: maxData.length > 0 ? maxData[0].value : 0
    };
  }

  /**
   * Get data for the last N hours
   */
  async getLastHours(
    tagName: string,
    hours: number,
    aggregation?: AggregationType,
    interval?: string
  ): Promise<HistorianDataPoint[]> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

    return await this.query({
      tagName,
      startTime,
      endTime,
      aggregation,
      interval
    });
  }

  /**
   * Get data for today
   */
  async getToday(
    tagName: string,
    aggregation?: AggregationType
  ): Promise<HistorianDataPoint[]> {
    const now = new Date();
    const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);

    return await this.query({
      tagName,
      startTime,
      endTime,
      aggregation,
      interval: '1h'
    });
  }

  /**
   * Compare two time periods
   */
  async comparePeriods(
    tagName: string,
    period1Start: Date,
    period1End: Date,
    period2Start: Date,
    period2End: Date,
    aggregation: AggregationType = 'avg'
  ): Promise<{
    period1: HistorianDataPoint[];
    period2: HistorianDataPoint[];
  }> {
    const [period1, period2] = await Promise.all([
      this.query({
        tagName,
        startTime: period1Start,
        endTime: period1End,
        aggregation
      }),
      this.query({
        tagName,
        startTime: period2Start,
        endTime: period2End,
        aggregation
      })
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
