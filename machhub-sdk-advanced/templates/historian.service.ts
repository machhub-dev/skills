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
