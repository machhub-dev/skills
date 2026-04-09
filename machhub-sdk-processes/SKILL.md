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
type ProcessLanguage = 'python' | 'typescript';
type TriggerType     = 'cron' | 'interval' | 'tag_change' | 'http' | 'manual';
type InputType       = 'tag' | 'sql';
type OutputType      = 'sql' | 'tag_write';

interface ProcessTrigger {
  type: TriggerType;
  config: TriggerConfig;
}

interface TriggerConfig {
  cron_expression?: string;        // e.g. "*/5 * * * *"
  interval_value?: number;         // e.g. 30
  interval_unit?: string;          // "seconds" | "minutes" | "hours"
  tag?: string;                    // e.g. "namespace/path/tag" (supports MQTT wildcards + and #)
  endpoint?: string;               // e.g. "my-endpoint" → POST /process/my-endpoint
}

interface ProcessInput {
  name: string;                    // accessible as context.inputs.name
  type: InputType;
  config: InputConfig;
}

interface InputConfig {
  tag?: string;                    // for tag input: tag path
  query?: string;                  // for sql input: SurrealDB query (domain-scoped)
}

interface ProcessOutput {
  type: OutputType;
  config: OutputConfig;
}

interface OutputConfig {
  query?: string;                  // for sql: supports {{output.field}} placeholders
  tag?: string;                    // for tag_write: tag path
  field?: string;                  // for tag_write: dot-notation path in return value e.g. "result.value"
}

interface ProcessKey   { key: string; }
interface ProcessValue { value: string; }

interface Process {
  id?: string;                     // "processes:xxx" — assigned by server
  domain_id?: string;              // owning domain record ID
  name: string;                    // stored as "domainKey.processName"
  language: ProcessLanguage;
  enabled: boolean;                // auto-execution on/off
  log_enabled: boolean;            // execution logging on/off
  code: string;                    // user code body
  version: number;                 // auto-incremented on code change
  triggers: ProcessTrigger[];
  inputs: ProcessInput[];
  outputs: ProcessOutput[];
  keys?: ProcessKey[];             // per-process environment keys
  values?: ProcessValue[];         // per-process environment values
  createdBy?: string;              // creator record ID
  createdDt?: string;              // ISO 8601 creation timestamp
  updated_dt?: string;             // ISO 8601 last-updated timestamp
}
```

> **Trigger runtime `data`** — the `data` field is populated at execution time and is never persisted. See each trigger type's section below for its shape.

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
Fires whenever a tag value changes (MQTT subscription). Supports MQTT wildcards in the tag path.
```
tag: "production/line1/status"       — exact topic
tag: "production/+/status"           — single-level wildcard (one segment)
tag: "production/#"                  — multi-level wildcard (all subtopics)
```
> The new value can be accessed from `trigger.data.payload` directly.

**`trigger.data` available in worker context:**
```typescript
trigger.data = {
  topic:           string,                   // concrete topic that fired, e.g. "production/line1/status"
  payload:         unknown,                  // decoded JSON value or raw string
  retain:          boolean,
  content_type:    string | undefined,
  user_properties: Record<string, string>    // MQTT 5 user properties (flat map)
}
```

### HTTP Trigger
Exposes a POST endpoint on MACHHUB:
```
endpoint: "calculate-oee"
→ POST /process/calculate-oee

endpoint: "oee/line1"
→ POST /process/oee/line1
```
The request body (JSON) is merged into `context.inputs` — each top-level key becomes an input override (highest precedence over configured inputs).  
The process return value is sent back as the HTTP response body **immediately** — outputs (SQL writes, tag writes) execute asynchronously in the background.

Endpoint slugs must be **lowercase alphanumeric, hyphens, and forward-slashes** for multi-level grouping.
Pattern: `^[a-z0-9-]+(/[a-z0-9-]+)*$`  No leading/trailing slashes.

**`trigger.data` available in worker context:**
```typescript
trigger.data = {
  method:  string,                         // "POST"
  headers: Record<string, string>,         // first value per header name
  query:   Record<string, string>,         // URL query params
  body:    Record<string, unknown>         // parsed JSON request body
}
```
> Body fields are also merged into `inputs` — `trigger.data.body` and `inputs` overlap. Use `inputs` for convenience, `trigger.data` for raw request inspection (headers, query params, method).

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
    // Runtime-only — never persisted; populated per invocation
    data?: {
      // tag_change
      topic?: string;            // concrete topic that fired
      payload?: unknown;         // decoded JSON or raw string
      retain?: boolean;
      content_type?: string;
      user_properties?: Record<string, string>;
      // http
      method?: string;
      headers?: Record<string, string>;
      query?: Record<string, string>;
      body?: Record<string, unknown>;
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
        # Runtime-only — populated per invocation, never persisted
        'data': {
            # tag_change
            'topic':           '...',  # concrete topic that fired
            'payload':         ...,    # decoded JSON value or raw string
            'retain':          False,
            'content_type':    '...',
            'user_properties': {},     # MQTT 5 user properties (flat dict)
            # http
            'method':          'POST',
            'headers':         {},     # first value per header name
            'query':           {},     # URL query params
            'body':            {},     # parsed JSON request body
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
Reads the current value of a tag. Supports MQTT wildcards (`+` and `#`).

**Exact tag path:**
```
name: "temperature"
type: "tag"
config.tag: "sensors/room1/temperature"

→ context.inputs.temperature = 25.4
```

**Wildcard tag path** — returns a map keyed by concrete topic:
```
name: "allRoomTemps"
type: "tag"
config.tag: "sensors/+/temperature"

→ context.inputs.allRoomTemps = {
     "sensors/room1/temperature": 25.4,
     "sensors/room2/temperature": 22.1,
     ...
   }
```
`+` matches a single topic level; `#` matches all remaining levels (multi-level). The result is always a `Record<string, any>` / `dict` keyed by the matching topic string.

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

## SDK Client API (`sdk.processes`)

After initializing the SDK, the `processes` namespace exposes three methods for managing and invoking processes from the frontend.

### `sdk.processes.execute(name, input?)`

Executes a process by name with optional input data. Works for any process regardless of its configured triggers.

```typescript
// Execute a process (no input)
const result = await sdk.processes.execute('processName');

// Execute a process with input data
const result = await sdk.processes.execute('calculateOEE', {
  lineId: 'line1',
  shift: 'morning'
});
```

**Signature:**
```typescript
execute(name: string, input?: Record<string, any>): Promise<any>
```

- `name` — the process name (e.g. `"processName"`)
- `input` — optional key/value pairs merged into `context.inputs` (override/supplement configured inputs)
- Returns the process return value directly

---

### `sdk.processes.getProcesses()`

Retrieves all processes belonging to the current domain.

```typescript
const processes: Process[] = await sdk.processes.getProcesses();

for (const p of processes) {
  console.log(p.name, p.language, p.enabled, p.version);
}
```

**Signature:**
```typescript
getProcesses(): Promise<Process[]>
```

---

### `sdk.processes.changeTriggers(id, triggers)`

Replaces the trigger list for a specific process. Overwrites all existing triggers with the provided array.

```typescript
import type { ProcessTrigger } from '@machhub-dev/sdk-ts';

const newTriggers: ProcessTrigger[] = [
  {
    type: 'cron',
    config: { cron_expression: '0 * * * *' }   // every hour
  },
  {
    type: 'tag_change',
    config: { tag: 'sensors/+/temperature' }
  }
];

const updated: Process = await sdk.processes.changeTriggers('processes:abc123', newTriggers);
```

**Signature:**
```typescript
changeTriggers(id: RecordID, triggers: ProcessTrigger[]): Promise<Process>
```

- `id` — process record ID (string `"processes:xxx"` or `RecordID` object)
- `triggers` — full replacement trigger list (empty array `[]` removes all triggers)
- Returns the updated `Process` object

---

### Type Exports

The following types are exported from `@machhub-dev/sdk-ts` for use with the processes API:

```typescript
import {
  Process,           // main process record interface
  ProcessTrigger,    // { type: TriggerType; config: TriggerConfig }
} from '@machhub-dev/sdk-ts';

import type {
  ProcessLanguage,   // 'python' | 'typescript'
  TriggerType,       // 'cron' | 'interval' | 'tag_change' | 'http' | 'manual'
  TriggerConfig,     // cron_expression, interval_value/unit, tag, endpoint
  InputType,         // 'tag' | 'sql'
  InputConfig,       // tag, query
  ProcessInput,      // name, type, config
  OutputType,        // 'sql' | 'tag_write'
  OutputConfig,      // query, tag, field
  ProcessOutput,     // type, config
  ProcessKey,        // { key: string }
  ProcessValue,      // { value: string }
} from '@machhub-dev/sdk-ts';
```

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

---

## Execution Behaviour

### Async outputs (HTTP and Execute-by-Name)
For HTTP-triggered processes and execute-by-name calls the function **return value is sent to the caller immediately** after your code completes. Outputs (SQL writes, tag writes) then run asynchronously in the background. Your code does not wait for them. This keeps HTTP latency low; errors in outputs are logged but do not affect the HTTP response.

For all other trigger types (cron, interval, tag_change, manual from the UI) outputs are synchronous — an output error will propagate and be logged.

### Domain Worker Lifecycle
Each domain runs its own isolated Python and TypeScript worker processes. Workers are:
- **Started automatically** when the first process for a domain is created or enabled.
- **Stopped automatically** when the last process for a domain is deleted or all are disabled.
- **Restarted** after package installation (Python `pip install`, TypeScript `npm install`).

Workers communicate with the MACHHUB API via per-domain NATS subjects. Each domain has its own `venv` (Python) and `node_modules` (TypeScript) directory.

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
3. Call `processService.execute('processName', inputData)` from your component
