import { getOrInitializeSDK } from './sdk.service';

const sdk = await getOrInitializeSDK();

// Get list of all available tags
const tags = await sdk.tag.getAllTags();
console.log(tags); // ['temperature/room1', 'humidity/room1', ...]
```

### Publish to Tag

```typescript
// Publish simple value
await sdk.tag.publish('temperature/room1', 25.5);

// Publish object
await sdk.tag.publish('sensor/data', {
  value: 25.5,
  unit: 'celsius',
  timestamp: new Date().toISOString(),
  status: 'normal'
});
```

---

## Subscribing to Tags

### Basic Subscription

```typescript
// Subscribe to single tag
await sdk.tag.subscribe('temperature/room1', (data) => {
  console.log('Temperature update:', data);
  // { value: 25.5, timestamp: '2024-01-01T00:00:00Z' }
});

// Subscribe to multiple tags
await sdk.tag.subscribe(['temperature/room1', 'humidity/room1'], (data) => {
  console.log('Sensor update:', data);
});
```

### Subscription with Topic Name

```typescript
// Access the topic name in callback (useful for wildcards)
await sdk.tag.subscribe('temperature/room1', (data, topic) => {
  console.log(`Update from ${topic}:`, data.value);
  // "Update from temperature/room1: 25.5"
});
```

---

## Wildcard Subscriptions

### Single-Level Wildcard (+)

Matches one level in the topic hierarchy:

```typescript
// Subscribe to all rooms' temperature
await sdk.tag.subscribe('temperature/+', (data, topic) => {
  console.log(`${topic}: ${data.value}`);
  // Matches: temperature/room1, temperature/room2, temperature/room3
  // Does NOT match: temperature/building/room1
});

// Subscribe to all sensors in room1
await sdk.tag.subscribe('+/room1', (data, topic) => {
  console.log(`${topic}: ${data.value}`);
  // Matches: temperature/room1, humidity/room1, pressure/room1
});
```

### Multi-Level Wildcard (#)

Matches all remaining levels in the topic hierarchy:

```typescript
// Subscribe to ALL sensor data
await sdk.tag.subscribe('sensor/#', (data, topic) => {
  console.log(`${topic}:`, data);
  // Matches: sensor/temp, sensor/room1/temp, sensor/building/floor1/room1/temp
});

// Subscribe to all data from building1
await sdk.tag.subscribe('building1/#', (data, topic) => {
  console.log(`${topic}:`, data);
  // Matches all topics starting with building1/
});
```

---

## Unsubscribing

**CRITICAL:** Always unsubscribe when component unmounts to prevent memory leaks.

```typescript
// Unsubscribe from specific tags
sdk.tag.unsubscribe(['temperature/room1', 'humidity/room1']);

// In application cleanup
let sdk: SDK;

async function setupSubscription() {
  sdk = await getOrInitializeSDK();
  await sdk.tag.subscribe('temperature/room1', handleUpdate);
}

// Call this when component/page unmounts or app closes
function cleanup() {
  if (sdk) {
    sdk.tag.unsubscribe(['temperature/room1']);
  }
}

setupSubscription();
```

---

## Real-time Service Example

```typescript
// services/monitoring.service.ts
import { getOrInitializeSDK } from './sdk.service';

interface SensorData {
  value: number;
  timestamp: string;
  quality: 'good' | 'bad' | 'uncertain';
}

class MonitoringService {
  private activeSubscriptions: string[] = [];
  private dataCallbacks: Map<string, Function> = new Map();

  async startMonitoring(
    sensors: string[],
    onUpdate: (sensor: string, data: SensorData) => void
  ): Promise<void> {
    try {
      const sdk = await getOrInitializeSDK();

      for (const sensor of sensors) {
        const callback = (data: SensorData, topic: string) => {
          this.handleSensorData(topic, data);
          onUpdate(topic, data);
        };

        await sdk.tag.subscribe(sensor, callback);
        this.activeSubscriptions.push(sensor);
        this.dataCallbacks.set(sensor, callback);
      }

      console.log('Monitoring started for:', sensors);
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      throw error;
    }
  }

  async stopMonitoring(): Promise<void> {
    try {
      const sdk = await getOrInitializeSDK();
      await sdk.tag.unsubscribe(this.activeSubscriptions);
      
      this.activeSubscriptions = [];
      this.dataCallbacks.clear();
      
      console.log('Monitoring stopped');
    } catch (error) {
      console.error('Failed to stop monitoring:', error);
    }
  }

  private async handleSensorData(
    sensor: string,
    data: SensorData
  ): Promise<void> {
    // Check thresholds and create alerts if needed
    if (sensor.includes('temperature') && data.value > 80) {
      await this.createAlert(sensor, data, 'Temperature too high');
    }
    
    if (sensor.includes('humidity') && (data.value < 30 || data.value > 70)) {
      await this.createAlert(sensor, data, 'Humidity out of range');
    }
  }

  private async createAlert(
    sensor: string,
    data: SensorData,
    message: string
  ): Promise<void> {
    try {
      const sdk = await getOrInitializeSDK();
      await sdk.collection('alerts').create({
        sensor,
        value: data.value,
        message,
        timestamp: new Date(),
        severity: 'high'
      });
    } catch (error) {
      console.error('Failed to create alert:', error);
    }
  }

  async getRecentAlerts(limit: number = 100) {
    try {
      const sdk = await getOrInitializeSDK();
      return await sdk.collection('alerts')
        .sort('timestamp', 'desc')
        .limit(limit)
        .getAll();
    } catch (error) {
      console.error('Error fetching alerts:', error);
      throw error;
    }
  }
}

export const monitoringService = new MonitoringService();
```

---

## Usage Example

```typescript
// In your application
import { monitoringService } from './services';

let sensorData = {};

async function initMonitoring() {
  await monitoringService.startMonitoring(
    ['temperature/room1', 'humidity/room1'],
    (sensor, data) => {
      sensorData[sensor] = data;
      // Update UI with new data
    }
  );
}

// Call on page/component mount
initMonitoring();

// Call on page/component unmount
async function cleanupMonitoring() {
  await monitoringService.stopMonitoring();
}

// Register cleanup handler (framework-specific)
window.addEventListener('beforeunload', cleanupMonitoring);
```

---

## Common Patterns

### Pattern: Dashboard with Multiple Sensors

```typescript
async function setupDashboard() {
  const sdk = await getOrInitializeSDK();
  
  // Subscribe to all building sensors
  await sdk.tag.subscribe('building1/#', (data, topic) => {
    updateDashboard(topic, data);
  });
}
```

### Pattern: Alert on Threshold

```typescript
await sdk.tag.subscribe('temperature/+', async (data, topic) => {
  if (data.value > 85) {
    await sdk.collection('alerts').create({
      type: 'temperature_high',
      sensor: topic,
      value: data.value,
      threshold: 85,
      timestamp: new Date()
    });
  }
});
```

### Pattern: Data Aggregation

```typescript
const dataBuffer = [];

await sdk.tag.subscribe('sensor/+/temperature', (data, topic) => {
  dataBuffer.push({ topic, ...data });
  
  // Process every 100 readings
  if (dataBuffer.length >= 100) {
    processDataBatch(dataBuffer);
    dataBuffer.length = 0;
  }
});
```

---

## Templates

### Template 1: Tag Subscription Service

**File:** `src/services/tag.service.ts`

**Purpose:** Complete service for real-time tag subscriptions

**Code:**

```typescript
// filepath: src/services/tag.service.ts
import { getOrInitializeSDK } from './sdk.service';
import type { SDK } from '@machhub-dev/sdk-ts';

export interface TagValue {
  value: any;
  timestamp: Date;
  quality?: 'good' | 'bad' | 'uncertain';
}

export type TagCallback = (value: any) => void;

class TagService {
  private sdk: SDK | null = null;
  private subscriptions = new Map<string, number>();
  private callbacks = new Map<string, Set<TagCallback>>();

  private async getSDK(): Promise<SDK> {
    if (!this.sdk) {
      this.sdk = await getOrInitializeSDK();
    }
    return this.sdk;
  }

  /**
   * Subscribe to a tag
   */
  async subscribe(topic: string, callback: TagCallback): Promise<() => void> {
    try {
      const sdk = await this.getSDK();

      // Add callback to set
      if (!this.callbacks.has(topic)) {
        this.callbacks.set(topic, new Set());
      }
      this.callbacks.get(topic)!.add(callback);

      // Subscribe if first callback for this topic
      if (!this.subscriptions.has(topic)) {
        const handler = (value: any) => {
          const callbacks = this.callbacks.get(topic);
          if (callbacks) {
            callbacks.forEach(cb => cb(value));
          }
        };

        const subId = await sdk.tag.subscribe(topic, handler);
        this.subscriptions.set(topic, subId);
      }

      // Return unsubscribe function
      return () => this.unsubscribe(topic, callback);
    } catch (error) {
      console.error(`Failed to subscribe to ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe from a tag
   */
  async unsubscribe(topic: string, callback: TagCallback): Promise<void> {
    const callbacks = this.callbacks.get(topic);
    if (!callbacks) return;

    callbacks.delete(callback);

    // If no more callbacks, unsubscribe from SDK
    if (callbacks.size === 0) {
      const subId = this.subscriptions.get(topic);
      if (subId !== undefined) {
        const sdk = await this.getSDK();
        await sdk.tag.unsubscribe(subId);
        this.subscriptions.delete(topic);
        this.callbacks.delete(topic);
      }
    }
  }

  /**
   * Unsubscribe all callbacks for a topic
   */
  async unsubscribeAll(topic: string): Promise<void> {
    const subId = this.subscriptions.get(topic);
    if (subId !== undefined) {
      const sdk = await this.getSDK();
      await sdk.tag.unsubscribe(subId);
      this.subscriptions.delete(topic);
      this.callbacks.delete(topic);
    }
  }

  /**
   * Publish to a tag
   */
  async publish(topic: string, value: any): Promise<void> {
    try {
      const sdk = await this.getSDK();
      await sdk.tag.publish(topic, value);
    } catch (error) {
      console.error(`Failed to publish to ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Get current value of a tag
   */
  async getValue(topic: string): Promise<any> {
    try {
      const sdk = await this.getSDK();
      return await sdk.tag.getValue(topic);
    } catch (error) {
      console.error(`Failed to get value for ${topic}:`, error);
      return null;
    }
  }

  /**
   * Get all available tags
   */
  async getAllTags(): Promise<string[]> {
    try {
      const sdk = await this.getSDK();
      return await sdk.tag.getAllTags();
    } catch (error) {
      console.error('Failed to get all tags:', error);
      return [];
    }
  }

  /**
   * Cleanup all subscriptions
   */
  async cleanup(): Promise<void> {
    const sdk = await this.getSDK();
    
    for (const [topic, subId] of this.subscriptions.entries()) {
      try {
        await sdk.tag.unsubscribe(subId);
      } catch (error) {
        console.error(`Failed to unsubscribe from ${topic}:`, error);
      }
    }
    
    this.subscriptions.clear();
    this.callbacks.clear();
  }
}

export const tagService = new TagService();
