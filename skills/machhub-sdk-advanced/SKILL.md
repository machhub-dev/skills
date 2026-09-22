---
name: machhub-sdk-advanced
description: Historian (time-series) reads with the MACHHUB SDK — latest values, time windows, aggregated CSV export — plus read-only Data Bridge queries (`sdk.bridge`) and calling server-side logic via Processes. Use for trends, charts, reports, exports, and reading an external SQL database from an app or process.
license: MPL-2.0
metadata:
  related_skills: "machhub-sdk-realtime, machhub-sdk-processes, machhub-databridge-json, machhub-namespace-json"
---

## Historian

The historian records a tag's values over time, but **only for tags with historization turned on** (Namespace page, or `machhub-namespace-json`). Each value is `{ timestamp: string, value: unknown }`.

MACHHUB can store history in SurrealDB (the default), TimescaleDB, or MySQL. Use the calls below and they work on all three.

### Which call

| Need | Call |
|---|---|
| Which tags have history | `historian.getAllHistorizedTags()` → `string[]` |
| Latest N stored values (newest first) | `historian.getLastNValues(topic, n)`, where `n` is 1–100 |
| Recent trend for a chart | `historian.getHistoricalData(topic, new Date(), '1d')` |
| Everything since a start time | `historian.getHistoricalData(topic, start)` (no range) |
| An exact window, bucketed and aggregated, several topics, for download | `historian.getHistoricalDataAsCSV(...)` |

### `getHistoricalData(topic, startTime, range?)`

- **With `range`**: returns the window *from now back by `range`*, and **`startTime` is ignored**. Numbers are averaged into buckets sized for the range:

  | range | `1m` | `5m` | `15m` | `30m` | `1h` | `3h` | `6h` | `12h` | `1d` | `7d` | `30d` |
  |---|---|---|---|---|---|---|---|---|---|---|---|
  | bucket | 1s | 5s | 10s | 30s | 1m | 3m | 5m | 10m | 20m | 2h | 12h |

  Stick to these values. Any other duration is accepted but uses 1-second buckets, which can mean a huge response.
- **Without `range`**: returns from `startTime` to now in 1-second buckets. Keep the window short.
- Non-numeric tags return values rather than averages.

```ts
const sdk = await getSDK();
const points = await sdk.historian.getHistoricalData('PlantA/Line1/Temperature', new Date(), '6h');
const series = points.map((p) => ({ t: new Date(p.timestamp), v: Number(p.value) }));
```

For a live chart, load history first and then append from `sdk.tag.subscribe` (see `machhub-sdk-realtime`).

### CSV export

```ts
const blob = await sdk.historian.getHistoricalDataAsCSV(
  ['PlantA/Line1/Temperature', 'PlantA/Line1/Pressure'],
  new Date('2026-09-01T00:00:00Z'),
  new Date('2026-09-02T00:00:00Z'),
  'Asia/Kuala_Lumpur',          // timezone for the timestamp column (optional)
  '5_minute',                   // bucket: '<n>_second|minute|hour|day' (optional)
  'mean' as any,                // mean | sum | min | max | median | none (see note)
  { 'PlantA/Line1/Temperature': 'Temp °C' } // column renames (optional)
);
saveBlob(new Blob([blob], { type: 'text/csv' }), 'line1-2026-09-01.csv');
```

- The topics become columns, with one row per timestamp.
- The server gzips the stream with `Content-Encoding: gzip`, so in a browser `fetch` has already decompressed it and the Blob is **plain CSV**, even though its type says `application/gzip`. Re-type it as `text/csv` before saving. In Node, the Blob is also already decompressed.
- **Typing note:** the SDK currently types `aggregation` as an object interface, so pass the string with `as any` until that's fixed in the SDK.

### Raw historian queries: avoid them

`historian.query(text)` passes your query straight to whichever historian database is active, in that database's language (SurrealQL, or SQL on TimescaleDB/MySQL). **Don't use it in apps.**

- It needs the separate `raw_query` feature, which admins shouldn't grant widely, because a raw query isn't confined to one domain.
- The same query breaks if an admin switches the historian backend.
- The storage layout is internal and differs per backend. On SurrealDB, for example, each topic is its own table keyed by time, and there is no `historian` table with a `topic` column.

If the calls above can't answer a question, add an API endpoint or a Process instead.

### `historian.subscribeLiveData`

This is the same MQTT subscription as `tag.subscribe` and shares its one-handler-per-topic table. Use `tag.subscribe` (through the tag hub in `machhub-sdk-realtime`) so the two don't overwrite each other.

---

## Data Bridge reads

A Data Bridge connects MACHHUB to an external SQL database (see `machhub-databridge-json`). `sdk.bridge(id).query` reads it **read-only**, through MACHHUB's stored connection. The app never sees the database password.

```ts
import { BridgeQueryError } from '@machhub-dev/sdk-ts';

const { columns, rows, truncated } = await sdk.bridge('databridges:erp').query<{ machine: string; qty: number }>(
  'SELECT machine, SUM(qty) AS qty FROM work_orders WHERE shift_date = ? GROUP BY machine',
  [today],                // positional ? parameters. Never concatenate values into the SQL
  { limit: 1000 }         // default 500, max 10,000; truncated: true means there's more
);
```

- The ID is the bridge's record ID (`databridges:<name>`).
- INSERT, UPDATE, DELETE and DDL are rejected by the database's read-only transaction. Egress routes are how data gets written.
- Errors throw `BridgeQueryError`. `err.transient === true` (HTTP 503) means a retry later may succeed.

---

## Server-side logic

The SDK has **no** `sdk.function`, `sdk.flow`, or `sdk.workflow` API. (`sdk.function` exists as a property but is never initialized and always throws.) To run logic on the server, like sending email, calling third-party APIs with secrets, heavy calculations, or scheduled jobs, write a **Process** and call it:

```ts
const result = await sdk.processes.execute('calculate_oee', { line: 'Line1', shift: 'A' });
```

Writing processes, their triggers, inputs and outputs, and `sdk.env` / `sdk.log` inside process code are covered in `machhub-sdk-processes`.
