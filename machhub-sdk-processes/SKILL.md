---
name: machhub-sdk-processes
description: "MACHHUB Processes: write, schedule, and execute Python or TypeScript code on the MACHHUB platform. Use when: configuring process triggers (cron, interval, tag_change, HTTP endpoint, manual), defining process inputs (tag reads, SQL queries) and outputs (SQL writes, tag writes), invoking a process from the frontend SDK, managing Python/npm package dependencies, or writing user code inside a Process (execute function context pattern)."
related_skills: [machhub-sdk-initialization, machhub-sdk-realtime, machhub-sdk-collections]
---

## Overview

**Processes** is MACHHUB's server-side code execution platform. It allows you to write Python or TypeScript functions that run on the MACHHUB backend, triggered by schedules, tag changes, HTTP calls, or manually.

**Use this skill when:**
- Scheduling background jobs (cron, interval timers)
- Reacting to IoT tag changes with server-side logic
- Exposing custom HTTP endpoints on MACHHUB
- Running data processing, aggregations, or automations
- Invoking server-side logic from the frontend
- Managing Python/TypeScript package dependencies per domain

**Key concepts:**
- Processes are **per-domain** — each domain has isolated Python and TypeScript workers
- Code is wrapped in an `execute(context)` function — you write the body only
- Inputs are resolved **before** your code runs (tag values, SQL results injected into `context`, HTTP body in `context.inputs`)
- Outputs are processed **after** your code returns (SQL writes, tag writes using `{{output.field}}`)
- Version-controlled: code changes increment the version and create a new file

---

## Process Data Model

```typescript
interface Process {
  id: string;                        // "processes:xxx"
  name: string;                      // stored as "domainID.processName"
  language: 'python' | 'typescript';
  enabled: boolean;                  // auto-execution on/off
  log_enabled: boolean;              // execution logging on/off
  code: string;                      // user code body
  version: number;                   // auto-incremented on code change
  triggers: Trigger[];
  inputs: Input[];
  outputs: Output[];
}

interface Trigger {
  type: 'cron' | 'interval' | 'tag_change' | 'http';  // configurable trigger types
  config: {
    cron_expression?: string;        // e.g. "*/5 * * * *"
    interval_value?: number;         // e.g. 30
    interval_unit?: 'seconds' | 'minutes' | 'hours';
    tag?: string;                    // e.g. "namespace/path/tag"
    endpoint?: string;               // e.g. "my-endpoint" → POST /process/my-endpoint
  };
}

interface Input {
  name: string;                      // accessible as context.inputs.name
  type: 'tag' | 'sql';
  config: {
    tag?: string;                    // for tag input: tag path
    query?: string;                  // for sql input: SurrealDB query (domain-scoped)
  };
}

interface Output {
  type: 'sql' | 'tag_write';
  config: {
    query?: string;                  // for sql: supports {{output.field}} placeholders
    tag?: string;                    // for tag_write: tag path
    field?: string;                  // for tag_write: dot-notation path in return value e.g. "result.value"
  };
}
```

---

## Trigger Types

### Cron
Runs on a standard cron schedule.
```
Expression examples:
  "*/5 * * * *"     — every 5 minutes
  "0 8 * * 1-5"     — weekdays at 8am
  "0 0 * * *"       — daily at midnight
```

### Interval
Runs every N seconds/minutes/hours after the previous execution completes.
```
interval_value: 30, interval_unit: "seconds"  → every 30 seconds
interval_value: 1,  interval_unit: "hours"    → every hour
```

### Tag Change
Fires whenever a tag value changes (MQTT subscription).
```
tag: "production/line1/status"
tag: "temperature/room1"
```
> The new value is **not** injected into the trigger context. Add a tag Input with the same tag path to read the current value into `inputs`.

### HTTP Trigger
Exposes a POST endpoint on MACHHUB:
```
endpoint: "calculate-oee"
→ POST /process/calculate-oee

endpoint: "oee/line1"
→ POST /process/oee/line1
```
The request body (JSON) is merged into `context.inputs` — each top-level key becomes an input override.  
The process return value is sent back as the HTTP response body.

Endpoint slugs must be **lowercase alphanumeric, hyphens, and forward-slashes** for multi-level grouping.
Pattern: `^[a-z0-9-]+(/[a-z0-9-]+)*$`  No leading/trailing slashes.

### Manual Execution
Processes with **no triggers** configured can still be run on demand:
- Via the **Run** button in the MACHHUB UI
- Via the **Execute by Name** API (see *Invoking a Process* section)

When run manually, `context.trigger.type` is `"manual"` and `context.trigger.config` is `{}`.

---

## Writing Process Code

You write only the **function body**. MACHHUB wraps it automatically.

### TypeScript Process

Your code runs inside:
```typescript
async function execute(context: ProcessContext): Promise<any> {
  const { inputs, trigger } = context;   // destructured for convenience
  // YOUR CODE HERE
}
```

**Context object:**
```typescript
interface ProcessContext {
  inputs: Record<string, any>;   // resolved input values (tag reads, SQL results, HTTP body fields)
  trigger: {
    type: string;                // "cron" | "interval" | "tag_change" | "http" | "manual"
    config: {
      cron_expression?: string;  // set for cron triggers
      interval_value?: number;   // set for interval triggers
      interval_unit?: string;    // set for interval triggers
      tag?: string;              // set for tag_change triggers
      endpoint?: string;         // set for http triggers
    };
  };
  timestamp: string;             // ISO 8601 execution timestamp
  domain_id: string;             // domain record ID
  process_name: string;          // process name
}
```

> **HTTP body handling:** For HTTP-triggered processes the request body fields are merged into `inputs`, not `trigger`. Access them via `inputs.myField`.  
> **Tag change value:** The new tag value is NOT automatically injected into the trigger. Add a **tag Input** to read the current value into `inputs.myInputName`.

**Example — TypeScript process body:**
```typescript
// Inputs and trigger are available directly (destructured by the wrapper)
const sensorValue = inputs.temperature;     // from a tag input named "temperature"
const latestRecord = inputs.latestReading;  // from an sql input named "latestReading"

// Your logic
const isAbnormal = sensorValue > 80;

if (isAbnormal) {
  console.log(`Abnormal temperature: ${sensorValue}`);
}

// Return value is used by outputs
return {
  status: isAbnormal ? 'alert' : 'normal',
  value: sensorValue,
  timestamp: new Date().toISOString()
};
```

See full example: [process.typescript.example.ts](./templates/process.typescript.example.ts)

---

## SDK (TypeScript only)

MACHHUB's TypeScript SDK (`@machhub-dev/sdk-ts`) is automatically initialized and injected as the global `sdk` into every TypeScript process. **No import or initialization is needed** — just use it directly.

```typescript
// Read all records from a collection
const records = await sdk.collection("myapp.readings").getAll();

// Create a new record
const record = await sdk.collection("myapp.events").create({
  type: "alert",
  value: 95,
  timestamp: new Date().toISOString()
});
```

The SDK is domain-scoped to the domain the process belongs to — it can only access resources within that domain.

> **Python:** The SDK is not available in Python processes. Use configured SQL Inputs/Outputs for data access.

### Python Process

Your code runs inside:
```python
def execute(context):
    inputs = context['inputs']
    trigger = context['trigger']
    # YOUR CODE HERE
```

**Context structure:**
```python
context = {
    'inputs':       { ... },         # resolved input values (tag reads, SQL results, HTTP body fields)
    'trigger': {
        'type':   'cron',            # 'cron' | 'interval' | 'tag_change' | 'http' | 'manual'
        'config': {
            'cron_expression': '...', # set for cron; or
            'interval_value':  30,    # set for interval; or
            'interval_unit':   '...',
            'tag':             '...',  # set for tag_change; or
            'endpoint':        '...',  # set for http
        },
    },
    'timestamp':    '2026-04-02T...', # ISO 8601
    'domain_id':    'domains:xxx',
    'process_name': 'myProcess',
}
```

> **HTTP body handling:** For HTTP-triggered processes the request body fields are merged into `inputs`, not `trigger`. Access them via `inputs['myField']`.  
> **Tag change value:** The new tag value is NOT automatically injected into the trigger. Add a **tag Input** to read the current value into `inputs['myInputName']`.

**Example — Python process body:**
```python
# inputs and trigger are local vars available in the wrapper
sensor_value = inputs['temperature']   # from a tag input named "temperature"
latest = inputs.get('latestReading')   # from an sql input named "latestReading"

# Your logic
is_abnormal = sensor_value > 80

if is_abnormal:
    print(f"Abnormal temperature: {sensor_value}")

# Return value is used by outputs
return {
    "status": "alert" if is_abnormal else "normal",
    "value": sensor_value,
    "timestamp": __import__('datetime').datetime.utcnow().isoformat()
}
```

See full example: [process.python.example.py](./templates/process.python.example.py)

---

## Inputs

Inputs are resolved **before** your code runs and injected into `context.inputs`.

### Tag Input
Reads the current value of a tag:
```
name: "temperature"
type: "tag"
config.tag: "sensors/room1/temperature"

→ context.inputs.temperature = 25.4
```

### SQL Input
Runs a SurrealDB query (domain-scoped — can only access tables in your domain):
```
name: "latestReading"
type: "sql"
config.query: "SELECT * FROM myapp.readings ORDER BY created_dt DESC LIMIT 1;"

→ context.inputs.latestReading = [{ id: "...", value: 25.4, ... }]
```

---

## Outputs

Outputs are processed **after** your code returns, using the return value.

### SQL Output
Executes a query using `{{output.field}}` placeholders replaced by your return value:
```
type: "sql"
config.query: "UPDATE myapp.status SET value = '{{output.status}}' WHERE id = 'myapp.status:main';"
```
`{{output.status}}` is replaced with `returnValue.status`.

### Tag Write
Writes a value from your return object to a tag:
```
type: "tag_write"
config.tag: "alerts/room1/status"
config.field: "status"             # dot-notation: "result.nested.value" also works
```
Writes `returnValue.status` to the tag `alerts/room1/status`.

---

## Invoking a Process from the Frontend

To call a process from your SvelteKit/frontend app, use the execute endpoint.

See full service: [process-execute.service.ts](./templates/process-execute.service.ts)

### Direct HTTP Call (HTTP-triggered process)
```typescript
// For processes with an HTTP trigger endpoint
const response = await fetch(`${MACHHUB_URL}/process/my-endpoint`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ param1: 'value1' })
});
const result = await response.json();
```

### Execute by Name (any process)
```typescript
// Execute any process by its name (domain-scoped)
const response = await fetch(`${MACHHUB_URL}/machhub/processes/execute`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'mydomainkey.processName',  // format: "domainKey.processName"
    input: { param1: 'value1' }       // overrides/supplements process inputs
  })
});
const result = await response.json();
```

---

## Package Management

Each domain has separate package registries for Python and TypeScript.

### Python
Add packages as you would `pip install`:
```json
[
  { "name": "requests", "version": "latest" },
  { "name": "pandas",   "version": "2.1.0" }
]
```
Generates `requirements.txt`, runs `pip install`, restarts Python worker.

### TypeScript
Add npm packages:
```json
[
  { "name": "lodash",  "version": "latest" },
  { "name": "axios",   "version": "1.6.0" }
]
```
Generates `package.json`, runs `npm install`, restarts TypeScript worker.

**Note:** Standard library modules (Node.js built-ins like `fs`, `path`) are always available without adding packages.

---

## Import / Export

Processes can be exported as JSON from the MACHHUB UI (**⋮ menu → Export**) and re-imported by creating a new process via the UI (use the **+** button and paste the JSON).

### Export Format

The exported file contains exactly these fields:

```json
{
  "name": "processName",
  "language": "python",
  "code": "# your code here\n",
  "triggers": [
    {
      "type": "cron",
      "config": { "cron_expression": "0 * * * *" }
    }
  ],
  "inputs": [
    {
      "name": "temperature",
      "type": "tag",
      "config": { "tag": "sensors/room1/temperature" }
    }
  ],
  "outputs": [
    {
      "type": "tag_write",
      "config": { "tag": "alerts/room1/status", "field": "status" }
    }
  ]
}
```

**Notes:**
- `enabled` and `log_enabled` are not exported; new imports default to `enabled: true`, `log_enabled: false`
- `version`, `id`, and `domain_id` are not exported — they are assigned fresh on import
- All trigger/input/output config keys use **snake_case** (matching the backend JSON tags)

---

## Real-time Log Streaming

Connect via WebSocket to stream live execution logs:

```typescript
// Stream execution logs for a specific process
const ws = new WebSocket(`ws://${MACHHUB_HOST}/ws/processes/${processId}/logs`);
ws.onmessage = (event) => {
  const log = JSON.parse(event.data);
  // { time, level, execution_id, process_id, process_name, message }
  console.log(`[${log.level}] ${log.message}`);
};

// Stream domain worker logs (Python/TypeScript stdout/stderr)
const workerWs = new WebSocket(
  `ws://${MACHHUB_HOST}/ws/processes/logs/domain/${domainId}/language/python`
);
```

---

## Common Patterns

### Pattern: Data Pipeline (collect → transform → store)
1. Add a **cron trigger** (e.g., every 5 minutes)
2. Add a **SQL input** to fetch the latest raw records
3. Write transformation logic in your code
4. Add a **SQL output** to persist results

### Pattern: Alert on Tag Change
1. Add a **tag_change trigger** on the sensor tag
2. Add a **tag Input** for the same tag path so the current value lands in `inputs.temperature`
3. In your code, check `inputs.temperature` (Python: `inputs['temperature']`) against a threshold
4. Add a **tag_write output** to publish to an alert tag (monitored by the frontend)

### Pattern: Custom HTTP API Endpoint
1. Add an **HTTP trigger** with a descriptive endpoint slug (e.g., `calculate-kpi`)
2. Access request body fields via `inputs.myField` — they are merged into inputs automatically
3. Perform computation and return result — the response body is your return value

### Pattern: Invoke from Frontend
1. Create a process with no triggers (or any trigger type)
2. Use the [process-execute.service.ts](./templates/process-execute.service.ts) template
3. Call `processService.execute('domainKey.processName', inputData)` from your component
