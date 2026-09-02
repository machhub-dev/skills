---
name: machhub-runtime-query
description: Answer natural-language data questions about the LIVE MACHHUB runtime by writing and running TypeScript/Node against it. Use when the user asks to look up, find, list, count, filter, inspect, summarize, or report on records in a MACHHUB collection, tag, historian series, or process — e.g. "which items are inactive?", "how many open purchase orders?", "show low-stock locations", "what's the latest reading for tag X". Connects through the Designer runtime connection on :61888 (no credentials needed). READ-ONLY — never mutates data. Discovers schema from the runtime, runs a query, returns the answer.
related_skills: [machhub-sdk-collections, machhub-sdk-advanced, machhub-sdk-processes, machhub-sdk-realtime, machhub-sdk-initialization]
---

## What this skill does

Turns a question like *"in the items collection, which are inactive?"* into a real query
against the **live runtime** and returns the answer. You discover the schema, write a tiny
Node script, run it, and read the JSON result.

This is the **execution** skill. For deeper query syntax, the sibling knowledge skills
(`machhub-sdk-collections`, `machhub-sdk-advanced`, `machhub-sdk-processes`) are the reference.

**Use it when** the user wants data *from their runtime* ("how many…", "which…", "list…",
"latest value of…", "is there a record where…"). **Don't** use it to scaffold app code — that's
the `machhub-sdk-*` skills.

## How the connection works (so you trust the results)

The MACHHUB Designer extension runs a proxy on **`localhost:61888`** that forwards to whichever
runtime it's connected to, **injecting the developer key + `Domain` header automatically**. In
Node, the SDK's `Initialize()` defaults to exactly that URL — so the harness needs **no
credentials**. You're always querying the runtime shown as "Connected" in the VS Code status bar.

**Prerequisite:** that status bar shows **MACHHUB: Connected**. If a query fails to connect,
that's the first thing to check (see Troubleshooting).

## Workflow (follow in order)

### 1. Discover the schema — don't guess field or collection names

```powershell
node .claude/skills/machhub-runtime-query/runner/schema.mjs            # all collections + tags + processes
node .claude/skills/machhub-runtime-query/runner/schema.mjs <name>     # filter, e.g. "items"
```

This lists every collection, its fields and types, and **inline enum options**. Map the user's
words to real collection/field names here (the user's "machines" might be `items`, `locations`,
or `work_orders` — confirm from the schema, don't assume).

### 2. Inspect ACTUAL values before filtering on them ⚠️

**Stored values are case-sensitive and may not match the schema's enum casing.** Real example
from this runtime: `items.itemStatus` is declared `enum("active","inactive",…)` (lowercase), but
rows exist with `"Active"` (capital A). A filter `.filter('itemStatus','=','inactive')` would
silently miss them.

So for any status/enum/category filter, first look at what's really stored:

```js
const sample = await sdk.collection('items').limit(1000).getAll({ fields: ['itemStatus'] });
const distinct = [...new Set(sample.map(r => r.itemStatus))];   // -> e.g. ["Active","inactive",...]
```

Then filter on the real value(s) — use `.orFilter(...)` to cover variants, or normalize in JS.

### 3. Write the query

Copy the template and edit it (keep scratch files named `_*.mjs` — they're gitignored):

```powershell
Copy-Item .claude/skills/machhub-runtime-query/runner/query.example.mjs `
          .claude/skills/machhub-runtime-query/runner/_scratch.mjs
```

```js
// _scratch.mjs
import { run } from './mch.mjs';

run(async (sdk) => {
  const inactive = await sdk.collection('items')
    .orFilter('itemStatus', '=', 'inactive')
    .orFilter('itemStatus', '=', 'Inactive')   // cover real casing variants (step 2)
    .getAll({ fields: ['itemCode', 'description', 'itemStatus'] });

  return { count: inactive.length, items: inactive };
});
```

Whatever you `return` is printed as JSON. `sdk` is **read-only**.

### 4. Run it and read stdout

```powershell
node .claude/skills/machhub-runtime-query/runner/_scratch.mjs
```

Result JSON → **stdout**. Errors → **stderr** as `[MCH ERROR] …`.

### 5. Answer the user

Give the answer plainly (the count, the list, the summary). Mention the collection/field and any
value-casing caveat you hit. Offer to refine or save the script if useful.

## Read-only contract

The harness **blocks** `create`, `update`, `delete`, `tag.publish`, and
`processes.changeTriggers` — they throw. Available read surfaces:

- **Collections:** `filter` · `orFilter` · `filterInArray` · `orFilterInArray` · `sort` ·
  `limit` · `offset` · `expand` · `getAll` · `first` · `count` · `getOne`
- **Historian (HTTP):** `query(SurrealQL)` · `getHistoricalData` · `getLastNValues` ·
  `getAllHistorizedTags` · `getHistoricalDataAsCSV`
- **Tags:** `getAllTags` (HTTP) · `subscribe` (live, MQTT — best-effort, see Limits)
- **Processes:** `getProcesses` (read). `execute(name, input)` is allowed but **may have side
  effects** — confirm with the user before running a process that isn't clearly read-only.

## Query reference (essentials)

**Filter operators** (SurrealDB): `=` `!=` `<` `<=` `>` `>=` `~` (contains/regex) `CONTAINS`
`CONTAINSANY` `INSIDE` (in array) … Full list in `machhub-sdk-collections`.

```js
sdk.collection('purchase_orders').filter('orderStatus','=','open').count();           // count
sdk.collection('items').filter('onHand','<',5).sort('onHand','asc').getAll();          // numeric + sort
sdk.collection('sales_orders').filter('custName','~','acme').getAll();                 // contains/regex
await sdk.collection('items').filter('itemCode','=','FG-001').first();                 // single record or null
sdk.collection('purchase_orders').getOne('purchase_orders:abc', { expand: 'orderLines' }); // by id + expand relation

// OR group (AND-ed with any plain .filter()):
sdk.collection('items').orFilter('itemStatus','=','inactive').orFilter('itemStatus','=','discontinued').getAll();

// Match inside a JSON array field (e.g. any order line referencing an item):
sdk.collection('purchase_orders').filterInArray('orderLines','itemId','=','items:abc').getAll();

// Historian (HTTP) — recent/historical tag values & raw SurrealQL:
sdk.historian.getLastNValues('SOME/Topic', 10);
sdk.historian.query('SELECT count() FROM item_location GROUP ALL');
```

**Performance:** prefer `.count()` over fetching+`.length`; use `{ fields: [...] }` to slim rows;
always `.limit()` exploratory `getAll()`. Aggregations not expressible via the builder can go
through `sdk.historian.query('<SurrealQL>')`.

**RecordIDs** look like `table:id` (e.g. `items:7xq…`). `getOne` accepts that string; relation
fields hold such ids — use `.expand('field')` / `getOne(id,{expand})` to resolve them.

## Limits & gotchas

- **Connection** = whatever the Designer is connected to. To query a different runtime, switch
  the Designer connection.
- **Case-sensitive values** — always do step 2 for enums/statuses.
- **Live tags (MQTT)** fail auth through the headless proxy, so `tag.subscribe`/`subscribeFor`
  usually return nothing. Use **historian** (HTTP) for tag values instead.
- **Auto-exit** — the harness calls `process.exit()` for you (the SDK's MQTT socket would
  otherwise keep Node alive). Don't add your own long-lived listeners.
- **Big results** — don't dump thousands of rows into the answer; summarize/count, or page.

## Troubleshooting

- `Initialize() returned false` / connect errors → Designer status bar isn't "Connected".
  Click it → reconnect. Confirm the runtime is up: `node runner/schema.mjs`.
- `Could not locate machhub-sdk-ts/dist` → build the SDK (`npm run build` in `../machhub-sdk-ts`)
  or set `MACHHUB_SDK_DIST`.
- Empty results when you expected data → re-check field name and **value casing** (step 2); try a
  broad `.limit(5).getAll()` to see real records first.
- Need the raw SDK banner / MQTT errors → set `MCH_VERBOSE=1`.
