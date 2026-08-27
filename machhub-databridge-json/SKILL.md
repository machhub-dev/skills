---
name: machhub-databridge-json
description: Generate and validate MACHHUB Data Bridge configuration in JSON for import — MySQL connections, outbound (egress) routes from UNS topics to database tables, inbound (ingress) routes polling tables into UNS topics, column mappings, write modes, watermarks and buffer policy.
---

# MACHHUB Data Bridge JSON Import Skill

## Skill Overview

A **Data Bridge** connects MACHHUB to an external customer database in both
directions, buffering to disk so values published during an outage still arrive,
in order, once the link returns.

This skill lets an AI assistant write a complete bridge configuration as JSON,
ready to paste into **Integration → Data Bridge → Import** or save as a `.json`
file and load there. It covers the exact accepted shape, every enum, the rules
the importer enforces, and the mistakes that get files rejected.

## When to Use This Skill

- Writing a new Data Bridge configuration from a description of the customer's
  database and what should flow where
- Adding egress or ingress routes to an exported bridge
- Migrating a bridge between environments (dev → staging → production)
- Reviewing or fixing a bridge JSON file that the import dialog rejected
- Generating column mappings from a table DDL the user pastes in
- Bulk-creating several bridges for a multi-site deployment

## Mental Model

```
egress  (outbound):  UNS topic  --selector-->  column mappings  -->  buffer  -->  MySQL table
ingress (inbound):   MySQL table  --watermark poll-->  payload mappings  -->  UNS topic
```

One bridge owns **one connection** to **one database**, plus any number of
routes over it. Routes are the unit of work; the connection is just the pipe.

---

## Accepted File Shapes

All three are valid input. Choose by how many bridges you are describing.

**One bridge → a bare object.** This is what a single-bridge export produces.

```json
{ "name": "Plant A MES", "driver": "mysql", "...": "..." }
```

**Several bridges → the versioned wrapper.** This is what an "Export All"
produces.

```json
{ "version": 1, "bridges": [ { "...": "..." }, { "...": "..." } ] }
```

**A bare array** is also accepted, and is equivalent to the wrapper:

```json
[ { "...": "..." }, { "...": "..." } ]
```

Machine-readable schema: [`schema/databridge.schema.json`](./schema/databridge.schema.json).
Validate your output against it before replying. It is deliberately a little
stricter than the importer — it also rejects fields that do not belong in a
file at all, such as `id`, `status`, `on` and `watermark`, which the importer
merely discards.

---

## Bridge Object

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | `string` | ✅ | Unique in the environment. Import matches on this to detect a collision. |
| `description` | `string` | ❌ | Free text. |
| `driver` | `"mysql"` | ✅ | Only MySQL today. |
| `host` | `string` | ✅ | Hostname or IP, max 255 chars. |
| `port` | `integer` | ✅ | 1–65535. MySQL default is `3306`. |
| `database` | `string` | ✅ | Schema name on the server. |
| `username` | `string` | ➖ | Not enforced by the API, but a bridge without one will not connect. Always set it. |
| `password` | `string` | ❌ | **Do not write this.** See [Credentials](#credentials). |
| `tlsMode` | `string` | ❌ | `"false"` (default), `"true"`, `"skip-verify"`, `"preferred"`. |
| `params` | `object` | ❌ | Extra DSN parameters, e.g. `{"charset": "utf8mb4"}`. String values only. |
| `bufferMaxAge` | Go duration | ❌ | Default `"72h"`. How long an undelivered record is kept. |
| `bufferMaxBytes` | `integer` | ❌ | Default `2147483648` (2 GiB). |
| `egressRoutes` | `EgressRoute[]` | ❌ | MACHHUB → database. |
| `ingressRoutes` | `IngressRoute[]` | ❌ | Database → MACHHUB. |

**Never include** these — they are runtime state or server-managed, and the
importer rejects or discards them: `id`, `status`, `statusMessage`, `on`,
`passwordSet`, `lastConnectedDt`, `created_dt`, `updated_dt`.

### `tlsMode` values

| Value | Meaning |
|---|---|
| `"false"` | No TLS. Only defensible on a trusted private network. |
| `"preferred"` | Use TLS if the server offers it, plaintext otherwise. |
| `"true"` | Require TLS **and verify the server certificate**. |
| `"skip-verify"` | Require TLS, do not verify the certificate. Encrypts against passive sniffing but not against a man in the middle — use for self-signed certs only. |

### Buffer policy

Both caps apply; whichever hits first wins, and overflow drops the **oldest**
record, counted and surfaced rather than silent.

`bufferMaxBytes` is the cap that matters in practice. 72h of history is only
reachable at modest sample rates — roughly 1,900 tags at one sample per minute
needs about 0.7 GB, but the same tags at 1 Hz need about 40 GB. If the user
describes high-rate tags, raise `bufferMaxBytes` or say plainly that the real
horizon will be far shorter than `bufferMaxAge` suggests.

---

## EgressRoute — MACHHUB to the database

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `string` | ✅ | Unique within the bridge. Use a UUID. |
| `name` | `string` | ❌ | Label shown in the UI. Always set one — it is what an operator reads in error messages. |
| `enabled` | `boolean` | ❌ | Defaults to `true` on import — a route written into a file is one you want running. |
| `selector` | `string` | ✅ | MQTT-style UNS topic selector. |
| `table` | `string` | ✅ | Must already exist. The bridge never creates tables. |
| `columns` | `ColumnMapping[]` | ✅ | At least one. |
| `writeMode` | `"insert"` \| `"upsert"` | ✅ | |
| `upsertKeys` | `string[]` | Conditional | Required when `writeMode` is `"upsert"`. |

### Selector syntax

| Pattern | Matches |
|---|---|
| `plantA/line1/temperature` | Exactly that topic |
| `plantA/+/temperature` | One level wildcard — `plantA/line1/temperature`, `plantA/line2/temperature` |
| `plantA/#` | Everything under `plantA`, at any depth |

### `writeMode`

`"insert"` appends a row per value. Correct for time-series and event logs.

`"upsert"` updates the row matching `upsertKeys`, or inserts it. Correct for
"current state" tables where one row per machine should be kept fresh.

**`upsertKeys` has two hard requirements.** Every key must (1) also appear as a
mapped `column` in this route, and (2) be covered by a `UNIQUE` or `PRIMARY` key
on the target table. Requirement 1 is checked when the bridge is saved.
Requirement 2 cannot be checked from the JSON alone — and getting it wrong is
the worst failure mode in the whole feature: without that key `ON DUPLICATE KEY
UPDATE` never fires, so the at-least-once delivery guarantee degrades silently
into duplicate rows on every replay. **If you write an upsert route, state in
your reply which index the target table needs.**

---

## IngressRoute — the database to MACHHUB

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `string` | ✅ | Unique within the bridge. |
| `name` | `string` | ❌ | |
| `enabled` | `boolean` | ❌ | Defaults to `true` on import. |
| `table` | `string` | Either/or | Source table. |
| `query` | `string` | Either/or | Custom `SELECT`, used instead of `table`. |
| `watermarkCol` | `string` | ✅ | Column the poller resumes from. |
| `watermarkKind` | `"autoincrement"` \| `"timestamp"` | ✅ | |
| `safetyLag` | Go duration | ❌ | Timestamp watermarks only. Default `"5s"`. |
| `pollInterval` | Go duration | ❌ | Default `"10s"`. |
| `batchSize` | `integer` | ❌ | Default `500`. |
| `topicTemplate` | `string` | ✅ | UNS topic to publish to. |
| `payload` | `ColumnMapping[]` | ❌ | Omit to publish the whole row. |

**Never include** `watermark` or `lastPollDt`. They are the poller's saved
position on *one specific database*. Carrying them into a file and importing it
elsewhere tells the new poller it has already read rows it has never seen, and
those rows are skipped forever. Export strips them; import discards them.

### Choosing a watermark

**Prefer `"autoincrement"`.** An auto-increment primary key is assigned in commit
order, so a resumed poll cannot skip anything, and no `safetyLag` is needed.

Use `"timestamp"` only when there is no monotonic integer column. A timestamp is
assigned when the row is *built*, not when it is *committed*, so a transaction
that starts at 10:00:00 and commits at 10:00:04 can appear behind a row already
read. `safetyLag` is the mitigation: rows newer than `now - safetyLag` are left
for the next poll. Set it above the longest write transaction on that table —
`"5s"` is the default, `"10s"`–`"30s"` is right for a busy OLTP table.

### `topicTemplate`

Go template syntax, interpolating **row column names**:

```
plantA/{{.machine_id}}/status
mes/workorders/{{.line_code}}/{{.order_no}}
```

Every interpolated name must be a column the query actually returns.

### Custom `query`

When set, `table` is ignored. The query **must**:

1. return `watermarkCol` among its columns, and
2. accept the watermark as a single `?` bind parameter.

```sql
SELECT r.id, r.sample_id, r.line_code, r.result_value, r.updated_at
FROM lab_results r
WHERE r.updated_at > ?
ORDER BY r.updated_at ASC
```

The `ORDER BY` on the watermark column is not optional in spirit — without it
the batch's last row is not the highest watermark, and the saved position skips
rows.

---

## ColumnMapping

Used by both directions. On egress `column` is the **target table column**; on
ingress it is the **payload field name**.

| Field | Type | Required | Notes |
|---|---|---|---|
| `column` | `string` | ✅ | |
| `source` | enum | ✅ | See below. |
| `expr` | `string` | Conditional | Required for `literal` and `jsonpath`. Ignored otherwise. |
| `type` | enum | ✅ | `int`, `float`, `decimal`, `bool`, `string`, `datetime`, `json`. |

### `source` values

| Source | Produces | `expr` |
|---|---|---|
| `value` | The tag value itself | — |
| `timestamp` | The sample's source timestamp | — |
| `topic` | The full UNS topic string | — |
| `literal` | A constant | The constant, e.g. `"PLANT_A"` |
| `jsonpath` | One field of a structured payload | The path, e.g. `"$.motor.rpm"` |

### `type`

The declared type is checked against the **real column type** when the bridge is
saved, and a narrowing conversion is refused there rather than truncating
silently on the first drain. So declare the type the column actually is — do not
declare `string` to make a mismatch go away.

Use `json` for a whole structured payload written into a JSON or TEXT column.

---

## Credentials

**Never put a real password in a JSON file you generate.**

- Export never writes one. Passwords are sealed with AES-256-GCM server-side and
  stripped from every API response.
- The import dialog asks for the password per bridge, and when replacing an
  existing bridge, leaving it blank keeps the stored credential.
- The `password` field exists in the schema only for scripted, non-interactive
  setup. If a user explicitly asks you to include one, put a **placeholder** —
  `"password": "REPLACE_ME"` — and tell them to fill it in at import time rather
  than committing it.

---

## Rules the Importer Enforces

The whole file is validated **before anything is created**, so a five-bridge file
with one typo creates nothing rather than leaving a half-import. These are the
checks; satisfy them and the file imports.

1. Every required field above is present and non-empty.
2. `driver` is `"mysql"`; `port` is 1–65535.
3. Route `id` values are unique within their bridge and their direction.
4. Every duration parses as a Go duration.
5. `writeMode` `"upsert"` has `upsertKeys`, and each key is among the mapped
   columns.
6. `watermarkKind` is one of the two enum values; `topicTemplate` is non-empty;
   either `table` or `query` is set.
7. Column `source` and `type` are valid enum values, and `literal`/`jsonpath`
   mappings carry an `expr`.
8. **No routing loop.** See below.
9. No two bridges in one file share a name.

### The routing loop check

An egress `selector` that matches topics an enabled ingress route publishes is
an infinite loop — database → UNS → database — that amplifies until the buffer
fills. The importer compares each egress selector against the **static prefix**
of each ingress `topicTemplate` (the part before the first `{{`) and refuses the
file if they overlap.

```json
// REJECTED — the selector swallows what the ingress route publishes
{ "egressRoutes":  [ { "selector": "mes/#", "...": "..." } ],
  "ingressRoutes": [ { "topicTemplate": "mes/workorders/{{.id}}", "...": "..." } ] }
```

```json
// FINE — the two namespaces do not overlap
{ "egressRoutes":  [ { "selector": "plantA/+/machine/state", "...": "..." } ],
  "ingressRoutes": [ { "topicTemplate": "mes/workorders/{{.id}}", "...": "..." } ] }
```

The fix is always a namespace convention: publish ingress data under a prefix
(`mes/`, `erp/`, `lims/`) that no egress selector reaches into.

---

## Generation Workflow

### Step 1 — Gather what you cannot guess

Ask for, or read from what the user pasted:

- Connection: host, port, database, username, TLS expectation
- **Target table DDL** for each egress route — column names, types, nullability,
  and crucially the `UNIQUE`/`PRIMARY` keys
- **Source table DDL** for each ingress route — and whether it has an
  auto-increment key
- The UNS topic structure on the MACHHUB side
- Direction and volume: what flows where, and roughly how fast

Do not invent table or column names. If the user has not given you the schema,
say what you need rather than producing a file that will fail validation against
a real database.

### Step 2 — Write the JSON

- One bridge → bare object. Several → `{"version": 1, "bridges": [...]}`.
- Mint a fresh UUID for every route `id`.
- Give every route a `name`.
- Omit optional fields you have no reason to set — defaults are good.
- Omit `password`, `id`, `status`, `on`, `watermark`, `lastPollDt` entirely.

### Step 3 — Check your own output

Before replying, walk the list under [Rules the Importer Enforces](#rules-the-importer-enforces).
Then check the three things the JSON cannot prove on its own, and **say them in
your reply**:

- Does the upsert target table have a `UNIQUE`/`PRIMARY` key on exactly
  `upsertKeys`?
- Does every `{{.column}}` in a `topicTemplate` exist in the ingress query's
  output?
- Are non-nullable target columns without a database default all mapped? An
  unmapped one fails every single insert.

---

## Worked Example

**User:** "Push our line 1 and line 2 temperature readings into the MES
`tag_readings` table — columns are `topic VARCHAR(255)`, `reading_value DOUBLE`,
`read_at DATETIME`, `site VARCHAR(16) NOT NULL`. Server is 10.20.0.15, database
`mes`, user `machhub`."

**Reasoning:**
- Two lines under one plant → the `+` wildcard, not two routes.
- Time-series append → `"insert"`, so no `upsertKeys`, so no index requirement.
- `site` is `NOT NULL` with no default → it must be mapped, and nothing in the
  UNS supplies it → `literal`.
- No ingress described → no `ingressRoutes`, and so no loop to check.

**Output:** see [`templates/egress-minimal.json`](./templates/egress-minimal.json).

---

## Templates

| File | Shows |
|---|---|
| [`templates/egress-minimal.json`](./templates/egress-minimal.json) | Smallest useful bridge: one insert route, four of the five column sources |
| [`templates/bidirectional.json`](./templates/bidirectional.json) | Egress upsert + ingress with an auto-increment watermark, non-overlapping namespaces |
| [`templates/multi-bridge.json`](./templates/multi-bridge.json) | The `{"version": 1, "bridges": [...]}` wrapper, plus a timestamp watermark over a custom `query` |

---

## Common Pitfalls

| Pitfall | Why it bites | Fix |
|---|---|---|
| `"bufferMaxAge": "3d"` | `d` is not a Go duration unit. Days do not exist. | `"72h"` |
| `upsertKeys` not backed by a DB index | `ON DUPLICATE KEY UPDATE` never fires; every replay duplicates rows, silently | Add a `UNIQUE` key on exactly those columns, or use `"insert"` |
| Including `watermark` in an ingress route | The new environment skips every row below it, permanently | Omit it |
| Egress selector overlapping an ingress topic | Infinite loop until the buffer fills | Namespace ingress topics under their own prefix |
| `"timestamp"` watermark with no `safetyLag` | Rows committed out of timestamp order are skipped | Set `safetyLag` above the longest write transaction |
| A custom `query` without `ORDER BY` on the watermark | The batch's last row is not the highest watermark; rows are skipped | Add `ORDER BY <watermarkCol> ASC` |
| Unmapped `NOT NULL` column with no default | *Every* insert fails; the route dead-letters everything | Map it, or give it a database default |
| Declaring `"type": "string"` for a numeric column | The save-time type check refuses it, or values truncate | Declare the type the column really is |
| A real password in the file | It ends up in git, in Slack, in a ticket | Omit it; enter it in the import dialog |

---

## Using the Result in MACHHUB

**Import:** Integration → Data Bridge → **Import**. Choose the `.json` file or
paste it, click **Review**, then per bridge choose *Create* / *Replace existing*
/ *Import as a copy*, enter the database password, and import. Bridges start
running immediately.

**Export:** Integration → Data Bridge → **Export All**, or **Export** on a single
bridge's page. The download is exactly the format above, so a round trip is
lossless apart from the deliberately omitted password and watermarks.

---

## Related Skills

- `machhub-collection-json` — collection schemas for the MACHHUB database
- `machhub-permission-json` — features and scopes import/export
