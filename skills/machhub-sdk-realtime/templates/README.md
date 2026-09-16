# MACHHUB SDK Real-time Templates

Templates for real-time tag subscriptions, IoT monitoring, and alert systems.

## Templates

### 1. `tag.service.ts`
**Tag subscription management**
- Subscribe/unsubscribe to tags
- Multiple callbacks per tag
- Wildcard support
- Cleanup handling
- Publish functionality

### 2. `dashboard.store.ts`
**Real-time dashboard state**
- Sensor data management
- Multiple subscription handling
- State updates
- Connection status
- Listener pattern

### 3. `alert.service.ts`
**Threshold-based alert system**
- Rule-based monitoring
- Condition evaluation
- Alert persistence
- Acknowledgement tracking
- Batch rule management

## Usage

### Tag Subscription

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

// Cleanup
unsubscribe();
```

### Dashboard Store

```typescript
import { dashboardStore } from './stores/dashboard.store';

// Subscribe to multiple sensors
await dashboardStore.subscribeMultiple([
  { topic: 'temperature/room1', unit: '°C' },
  { topic: 'humidity/room1', unit: '%' }
]);

// Listen to updates
dashboardStore.subscribe((state) => {
  console.log('Sensors:', state.sensors);
});
```

### Alert System

```typescript
import { alertService } from './services/alert.service';

// Add alert rule
await alertService.addRule({
  id: 'temp-high',
  topic: 'temperature/room1',
  condition: 'above',
  threshold: 30,
  enabled: true
});

// Get unacknowledged alerts
const alerts = await alertService.getUnacknowledgedAlerts();
```

## See Also

- [machhub-sdk-initialization](../machhub-sdk-initialization/) - SDK setup
- [machhub-sdk-collections](../machhub-sdk-collections/) - Store alerts
