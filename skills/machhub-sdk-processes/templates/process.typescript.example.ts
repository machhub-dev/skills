/**
 * TypeScript Process Example
 *
 * MACHHUB wraps your code in:
 *   async function execute(context: ProcessContext): Promise<any>
 *
 * Write only the BODY — do not define the function signature yourself.
 *
 * inputs   — resolved input values (tag reads, SQL results, HTTP body fields).
 *            'inputs' is destructured from 'context' by the wrapper.
 * trigger  — trigger metadata: { type, config, data }.
 *            'trigger' is destructured from 'context' by the wrapper.
 *            trigger.data is runtime-only and contains MQTT packet info (tag_change)
 *            or HTTP request details (http trigger).
 * context  — full context object (also has: timestamp, domain_id, process_name)
 *
 * Return value → processed by your configured Outputs (SQL writes, tag writes).
 *
 * SDK (TypeScript only):
 *   The MACHHUB SDK is auto-injected as the global `sdk`.
 *   No import or initialization needed.
 *   Example: await sdk.collection("myapp.data").getAll()
 *
 * Wildcard tag inputs:
 *   A tag input with a wildcard path (e.g. "sensors/+/temperature") resolves to
 *   a map of matching topics: { "sensors/room1/temperature": 25.4, ... }
 */

// ---------------------------------------------------------------------------
// context type (for reference — provided by MACHHUB runtime)
// ---------------------------------------------------------------------------
interface ProcessContext {
    inputs: Record<string, unknown>;
    trigger: {
        type: 'cron' | 'interval' | 'tag_change' | 'http' | 'manual';
        config: {
            cron_expression?: string;
            interval_value?: number;
            interval_unit?: string;
            tag?: string;       // tag path for tag_change triggers (supports MQTT wildcards + and #)
            endpoint?: string;  // endpoint slug for http triggers
        };
        // Runtime-only — populated per invocation, never persisted
        data?: {
            // tag_change: MQTT packet metadata
            topic?: string;                       // concrete topic that fired (useful when using wildcards)
            payload?: unknown;                    // decoded JSON value or raw string
            retain?: boolean;
            content_type?: string;
            user_properties?: Record<string, string>;
            // http: request details
            method?: string;
            headers?: Record<string, string>;     // first value per header name
            query?: Record<string, string>;       // URL query params
            body?: Record<string, unknown>;       // parsed JSON request body
        };
    };
    timestamp: string;
    domain_id: string;
    process_name: string;
}

// ---------------------------------------------------------------------------
// Example 1: Tag threshold alert
// Trigger: tag_change on "sensors/line1/temperature"
// Input:   tag input named "temperature" → reads "sensors/line1/temperature"
//          (the new value is NOT in trigger.config — use a tag Input instead)
// Output:  tag_write → "alerts/line1/temperature_status"
// ---------------------------------------------------------------------------
const newValue = inputs.temperature as number;  // from tag Input named "temperature"
const THRESHOLD = 80;

const status = newValue > THRESHOLD ? 'alert' : 'normal';
console.log(`Temperature: ${newValue}°C — status: ${status}`);

return { status, value: newValue, timestamp: new Date().toISOString() };

// ---------------------------------------------------------------------------
// Example 2: Scheduled data aggregation
// Trigger: cron "0 * * * *"  (every hour)
// Input:   sql "hourlyReadings" → SELECT * FROM myapp.readings WHERE ...
// Output:  sql → INSERT INTO myapp.hourly_summary ...
// Note: 'inputs' is destructured from context by the wrapper — use directly.
// ---------------------------------------------------------------------------
const readings = inputs.hourlyReadings as Array<{ value: number; }>;

if (!readings || readings.length === 0) {
    return { count: 0, average: null };
}

const values = readings.map(r => r.value);
const average = values.reduce((a, b) => a + b, 0) / values.length;
const min = Math.min(...values);
const max = Math.max(...values);

console.log(`Aggregated ${readings.length} readings. avg=${average.toFixed(2)}`);

return {
    count: readings.length,
    average: parseFloat(average.toFixed(4)),
    min,
    max,
    timestamp: new Date().toISOString()
};

// ---------------------------------------------------------------------------
// Example 3: HTTP endpoint — custom calculation
// Trigger: http "calculate-oee"  →  POST /process/calculate-oee
// Input:   sql "shiftData"
//          HTTP body fields are merged into 'inputs' automatically.
//          e.g. POST body { "line": "A", "shift": "morning" } → inputs.line, inputs.shift
// Output:  none (result returned directly as HTTP response)
// ---------------------------------------------------------------------------
const line = inputs.line as string;    // from HTTP request body
const shift = inputs.shift as string;  // from HTTP request body
const shiftData = inputs.shiftData as Array<{
    planned_time: number;
    run_time: number;
    good_parts: number;
    total_parts: number;
    ideal_cycle_time: number;
}>;

if (!shiftData || shiftData.length === 0) {
    return { error: 'No shift data found' };
}

const d = shiftData[0];
const availability = d.run_time / d.planned_time;
const performance = (d.ideal_cycle_time * d.total_parts) / d.run_time;
const quality = d.good_parts / d.total_parts;
const oee = availability * performance * quality;

return {
    line,
    shift,
    oee: parseFloat((oee * 100).toFixed(2)),
    availability: parseFloat((availability * 100).toFixed(2)),
    performance: parseFloat((performance * 100).toFixed(2)),
    quality: parseFloat((quality * 100).toFixed(2))
};

// ---------------------------------------------------------------------------
// Example 4: Using the MACHHUB SDK (TypeScript only)
// The SDK is injected as the global `sdk` — no import or initialization needed.
// Trigger: cron
// Input:   none
// Output:  none
// ---------------------------------------------------------------------------
const records = await sdk.collection('myapp.readings').getAll();
console.log(`Fetched ${records.length} records`);

const latest = records[records.length - 1];
if (latest && latest.value > 90) {
    await sdk.collection('myapp.alerts').create({
        source: 'process',
        value: latest.value,
        timestamp: new Date().toISOString()
    });
}

return { processed: records.length };

// ---------------------------------------------------------------------------
// Example 5: Wildcard tag input
// Trigger:  cron
// Input:    tag input named "allTemps" with config.tag = "sensors/+/temperature"
//           → resolves to a map: { "sensors/room1/temperature": 25.4, ... }
// Output:   none
// ---------------------------------------------------------------------------
const allTemps = inputs.allTemps as Record<string, number>;

const entries = Object.entries(allTemps);
const avg = entries.reduce((sum, [, v]) => sum + v, 0) / entries.length;

console.log(`Average temperature across ${entries.length} sensors: ${avg.toFixed(2)}°C`);
return { count: entries.length, average: parseFloat(avg.toFixed(4)), readings: allTemps };

// ---------------------------------------------------------------------------
// Example 6: Accessing trigger.data in a tag_change process
// Trigger:  tag_change on "production/+/status"
// Input:    none
// Output:   none
// ---------------------------------------------------------------------------
const topic = trigger.data?.topic ?? 'unknown';          // e.g. "production/line1/status"
const newPayload = trigger.data?.payload;                // decoded JSON or raw string
const userProps = trigger.data?.user_properties ?? {};

console.log(`Tag change on ${topic}: ${JSON.stringify(newPayload)}`);

// Extract the line segment from the wildcard topic
const line = topic.split('/')[1] ?? 'unknown';
return { line, status: newPayload, topic };

// ---------------------------------------------------------------------------
// Example 7: Accessing trigger.data in an HTTP process
// Trigger:  http "process-order"  →  POST /process/process-order
// Input:    none (body fields arrive in inputs AND trigger.data.body)
// Output:   sql
// ---------------------------------------------------------------------------
const orderId = inputs.orderId as string;    // from HTTP body (via inputs merge)
const queryParam = trigger.data?.query?.['debug'] === 'true';

console.log(`Processing order ${orderId}, debug=${queryParam}`);
return { orderId, processed: true };
