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
```

**Usage:**

```typescript
import { tagService } from './services/tag.service';

// Subscribe to temperature
const unsubscribe = await tagService.subscribe(
  'temperature/room1',
  (value) => {
    console.log('Temperature:', value);
  }
);

// Publish value
await tagService.publish('temperature/room1', 25.5);

// Get current value
const currentValue = await tagService.getValue('temperature/room1');

// Cleanup
unsubscribe();
```

---

### Template 2: Real-time Dashboard Store

**File:** `src/stores/dashboard.store.ts`

**Purpose:** State management for real-time dashboard data

**Code:**

```typescript
// filepath: src/stores/dashboard.store.ts
import { tagService, type TagCallback } from '../services/tag.service';

export interface SensorData {
  topic: string;
  value: any;
  timestamp: Date;
  unit?: string;
}

export interface DashboardState {
  sensors: Map<string, SensorData>;
  isConnected: boolean;
  lastUpdate: Date | null;
}

class DashboardStore {
  private state: DashboardState = {
    sensors: new Map(),
    isConnected: false,
    lastUpdate: null
  };

  private listeners: Array<(state: DashboardState) => void> = [];
  private unsubscribers = new Map<string, () => void>();

  /**
   * Subscribe to a sensor topic
   */
  async subscribeSensor(topic: string, unit?: string): Promise<void> {
    try {
      // Avoid duplicate subscriptions
      if (this.unsubscribers.has(topic)) {
        return;
      }

      const callback: TagCallback = (value) => {
        this.updateSensor(topic, value, unit);
      };

      const unsubscribe = await tagService.subscribe(topic, callback);
      this.unsubscribers.set(topic, unsubscribe);

      this.setState({
        isConnected: true
      });
    } catch (error) {
      console.error(`Failed to subscribe to ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe from a sensor topic
   */
  unsubscribeSensor(topic: string): void {
    const unsubscribe = this.unsubscribers.get(topic);
    if (unsubscribe) {
      unsubscribe();
      this.unsubscribers.delete(topic);
      
      const sensors = new Map(this.state.sensors);
      sensors.delete(topic);
      
      this.setState({ sensors });
    }
  }

  /**
   * Subscribe to multiple sensors
   */
  async subscribeMultiple(
    topics: Array<{ topic: string; unit?: string }>
  ): Promise<void> {
    await Promise.all(
      topics.map(({ topic, unit }) => this.subscribeSensor(topic, unit))
    );
  }

  /**
   * Update sensor data
   */
  private updateSensor(topic: string, value: any, unit?: string): void {
    const sensors = new Map(this.state.sensors);
    
    sensors.set(topic, {
      topic,
      value,
      timestamp: new Date(),
      unit
    });

    this.setState({
      sensors,
      lastUpdate: new Date()
    });
  }

  /**
   * Get sensor data by topic
   */
  getSensor(topic: string): SensorData | undefined {
    return this.state.sensors.get(topic);
  }

  /**
   * Get all sensors
   */
  getAllSensors(): SensorData[] {
    return Array.from(this.state.sensors.values());
  }

  /**
   * Get current state
   */
  getState(): DashboardState {
    return {
      ...this.state,
      sensors: new Map(this.state.sensors)
    };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: DashboardState) => void): () => void {
    this.listeners.push(listener);
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup(): void {
    for (const unsubscribe of this.unsubscribers.values()) {
      unsubscribe();
    }
    
    this.unsubscribers.clear();
    this.listeners = [];
    
    this.setState({
      sensors: new Map(),
      isConnected: false,
      lastUpdate: null
    });
  }

  /**
   * Set state and notify listeners
   */
  private setState(updates: Partial<DashboardState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}

export const dashboardStore = new DashboardStore();
```

**Usage:**

```typescript
import { dashboardStore } from './stores/dashboard.store';

// Subscribe to sensors
await dashboardStore.subscribeMultiple([
  { topic: 'temperature/room1', unit: 'Â°C' },
  { topic: 'humidity/room1', unit: '%' },
  { topic: 'pressure/room1', unit: 'hPa' }
]);

// Listen to state changes
const unsubscribe = dashboardStore.subscribe((state) => {
  console.log('Sensors:', state.sensors);
  console.log('Last update:', state.lastUpdate);
});

// Get specific sensor
const temp = dashboardStore.getSensor('temperature/room1');

// Cleanup
dashboardStore.cleanup();
unsubscribe();
```

---

### Template 3: Alert System

**File:** `src/services/alert.service.ts`

**Purpose:** Monitor tags and create alerts based on thresholds

**Code:**

```typescript
// filepath: src/services/alert.service.ts
import { tagService } from './tag.service';
import { getOrInitializeSDK } from './sdk.service';

export interface AlertRule {
  id: string;
  topic: string;
  condition: 'above' | 'below' | 'equals' | 'notEquals';
  threshold: number;
  enabled: boolean;
  description?: string;
}

export interface Alert {
  id: string;
  ruleId: string;
  topic: string;
  value: any;
  threshold: number;
  condition: string;
  timestamp: Date;
  acknowledged: boolean;
}

class AlertService {
  private rules = new Map<string, AlertRule>();
  private unsubscribers = new Map<string, () => void>();
  private collectionName = 'alerts';

  /**
   * Add alert rule
   */
  async addRule(rule: AlertRule): Promise<void> {
    try {
      this.rules.set(rule.id, rule);

      if (rule.enabled) {
        await this.activateRule(rule);
      }
    } catch (error) {
      console.error('Failed to add rule:', error);
      throw error;
    }
  }

  /**
   * Remove alert rule
   */
  async removeRule(ruleId: string): Promise<void> {
    const unsubscribe = this.unsubscribers.get(ruleId);
    if (unsubscribe) {
      unsubscribe();
      this.unsubscribers.delete(ruleId);
    }
    
    this.rules.delete(ruleId);
  }

  /**
   * Enable rule
   */
  async enableRule(ruleId: string): Promise<void> {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = true;
      await this.activateRule(rule);
    }
  }

  /**
   * Disable rule
   */
  disableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = false;
      
      const unsubscribe = this.unsubscribers.get(ruleId);
      if (unsubscribe) {
        unsubscribe();
        this.unsubscribers.delete(ruleId);
      }
    }
  }

  /**
   * Activate alert rule
   */
  private async activateRule(rule: AlertRule): Promise<void> {
    const callback = async (value: any) => {
      if (this.checkCondition(value, rule)) {
        await this.createAlert(rule, value);
      }
    };

    const unsubscribe = await tagService.subscribe(rule.topic, callback);
    this.unsubscribers.set(rule.id, unsubscribe);
  }

  /**
   * Check if condition is met
   */
  private checkCondition(value: any, rule: AlertRule): boolean {
    const numValue = typeof value === 'number' ? value : parseFloat(value);
    
    if (isNaN(numValue)) {
      return false;
    }

    switch (rule.condition) {
      case 'above':
        return numValue > rule.threshold;
      case 'below':
        return numValue < rule.threshold;
      case 'equals':
        return numValue === rule.threshold;
      case 'notEquals':
        return numValue !== rule.threshold;
      default:
        return false;
    }
  }

  /**
   * Create alert in collection
   */
  private async createAlert(rule: AlertRule, value: any): Promise<void> {
    try {
      const sdk = await getOrInitializeSDK();
      
      const alert: Omit<Alert, 'id'> = {
        ruleId: rule.id,
        topic: rule.topic,
        value,
        threshold: rule.threshold,
        condition: rule.condition,
        timestamp: new Date(),
        acknowledged: false
      };

      await sdk.collection(this.collectionName).create(alert);
      
      console.warn(`Alert triggered for ${rule.topic}: ${value} ${rule.condition} ${rule.threshold}`);
    } catch (error) {
      console.error('Failed to create alert:', error);
    }
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    try {
      const sdk = await getOrInitializeSDK();
      const fullId = `myapp.${this.collectionName}:${alertId}`;
      
      await sdk.collection(this.collectionName).update(fullId, {
        acknowledged: true
      });
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      throw error;
    }
  }

  /**
   * Get unacknowledged alerts
   */
  async getUnacknowledgedAlerts(): Promise<Alert[]> {
    try {
      const sdk = await getOrInitializeSDK();
      
      return await sdk
        .collection(this.collectionName)
        .filter('acknowledged', 'eq', false)
        .sort('timestamp', 'desc')
        .getAll();
    } catch (error) {
      console.error('Failed to get alerts:', error);
      return [];
    }
  }

  /**
   * Cleanup all rules
   */
  cleanup(): void {
    for (const unsubscribe of this.unsubscribers.values()) {
      unsubscribe();
    }
    
    this.unsubscribers.clear();
    this.rules.clear();
  }
}

export const alertService = new AlertService();
