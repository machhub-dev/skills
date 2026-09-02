---
name: machhub-headless-sdk
description: Run the MACHHUB SDK headless from a standalone Node script (no browser/UI) to read or write live backend data for one-off bulk ops, seeds, backfills, and audits. Use when an AI agent needs to query or mutate MACHHUB collections directly without going through the app - e.g. bulk-updating items, seeding flags from a spreadsheet, or fixing data in place.
related_skills: [machhub-sdk-initialization, machhub-sdk-collections, machhub-sdk-advanced, machhub-sdk-architecture, machhub-sdk-authentication, machhub-runtime-query]
---

# Headless MACHHUB SDK (for AI agents)

Run a **standalone Node ESM script** that imports the SDK package directly. It authenticates against the live backend through the MACHHUB Designer Extension's proxy.

## How it works

The MACHHUB Designer (VSCode) extension runs an authenticated **proxy at `http://localhost:61888`** (this is also the dev/preview server that serves the app). When the SDK's `Initialize()` runs with **no `window`** (i.e. in Node), it falls back to `hostname = 'localhost'` and port `61888` - exactly the proxy. Auth and credentials are handled entirely by the extension; the script passes no keys.

Verified in `node_modules/@machhub-dev/sdk-ts/dist/sdk-ts.js`: in `Initialize()`, `hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'`, and the env config port defaults to `61888`.

## Prerequisites (ALL required)

- MACHHUB Designer Extension installed and active in this VSCode workspace.
- The extension proxy is up at `http://localhost:61888` - i.e. the MACHHUB dev/preview server is running and reachable. (`curl http://localhost:61888` should respond.)
- User is logged in through the extension (the proxy injects auth; an expired session = 401s).
- Package present: `@machhub-dev/sdk-ts`.
- Run with Node ESM (`.mjs`, or `"type":"module"`). Use the workspace's Node so it resolves the installed SDK.

If the proxy is down or the user is logged out, the script fails - there is no other auth path. Ask the user to start the MACHHUB dev server / log in via the extension.

## Quick start

```js
// scripts/<task>/run.mjs
import { SDK } from '@machhub-dev/sdk-ts';

const sdk = new SDK();
if (!(await sdk.Initialize({ application_id: '<your-app>' }))) {
  console.error('SDK init failed - is the extension proxy on :61888 up and are you logged in?');
  process.exit(1);
}

// READ (paginate; getAll returns one page)
const items = await sdk.collection('items').limit(1000).offset(0).getAll();

// WRITE (partial update; id = "Table:ID")
await sdk.collection('items').update('<app>.items:04-110027-002', {
  requiresSerialNumber: true,
  updated_dt: new Date().toISOString()
});
```

Run: `node scripts/<task>/run.mjs`

## Conventions & gotchas

- **`MQTT connection error: Bad User Name or Password` on init is BENIGN.** It only affects real-time subscriptions. HTTP reads/writes still work - do not treat it as a failure.
- **Record id format is `Table:ID`**, e.g. `<app>.items:<itemCode>`. From a fetched record: `` `${rec.id.Table}:${rec.id.ID}` ``.
- **`getAll()` returns a single page** - loop `offset += limit` until a batch is shorter than the page size. Use `limit(1000)`.
- **`update(id, partial)` accepts a partial** - only send changed fields (plus `updated_dt`). Avoid sending `created_dt` on updates.
- **Always dry-run first.** Default the script to no-writes; gate mutations behind an `--apply` flag. Print a diff/summary (will-change / unchanged / skipped counts) before writing, then re-run with `--apply`.
- After bulk qty changes, honor the project's sync conventions (e.g. snapshot resync, ERP change log) - see that project's own rules.

## Big filters: the request-size cliff

A large filter set does not fit in a URL, and the failure is badly disguised. Everything below was measured against a live extension proxy on 2026-09-02.

`getAll()` and `count()` put every filter in the query string. The API server (Fiber/fasthttp) reads the request line **and all headers** into one buffer, so the JWT competes for the same budget as the filters:

| Request size (URL) | Result through the `:61888` proxy |
| --- | --- |
| up to ~3.5 KB | works |
| ~4 KB and up | **`500 {"error":"Failed to forward request"}`** |
| over 16 KB | `431 Request Header Fields Too Large` |

**The 500 is the trap.** Through the extension proxy the upstream 431 is swallowed and re-reported as a generic forwarding failure, so a script that suddenly fails after you widened a filter looks like a proxy or auth problem. Called directly (not through the proxy) the same request returns `431 Request Header Fields Too Large`, which surfaces in the SDK as:

```
Collection operation 'getAll' failed on '<collection>': (EXCEPTION) Request Header Fields Too Large
```

The 16 KB ceiling is Node's own `maxHeaderSize` in the extension host - a second, higher wall that stands even after the API server raises its own buffer.

**What to do:**

1. **Update the SDK.** From the release that adds body-carried queries, `getAll()` and `count()` switch themselves to `PATCH <collection>/all` with the options in a JSON body once the encoded query string passes ~1200 chars. Nothing changes at the call site. Check the installed version before assuming you have it - an older `node_modules` copy still sends everything in the URL.
2. **Collapse OR chains into `IN`.** `.filter('itemId', 'IN', ids.join(','))` costs ~25 bytes per id where `.orFilter()` per id costs ~55. Values are split on `,`, so this is unusable for values that can contain commas.
3. **Chunk.** For an unbounded id list, batch ~50 at a time and merge client-side. This is the only option that works regardless of SDK and server version.

## Worked example shape

A safe bulk-update script: load the target map (spreadsheet, JSON, another collection), fetch the affected records **paginated**, diff each against the target, print will-change / unchanged / skipped counts, and exit without writing unless `--apply` is passed. Keep the script in `scripts/<task>/` next to the data it reads.

## Related skills

This is the **headless/Node** counterpart to the in-app (browser) SDK skills. The SDK API surface is identical - only the init path differs.

- `machhub-sdk-initialization` - the in-app/browser init path and the singleton `sdk.service.ts`; this skill is the alternative when there is no `window`.
- `machhub-sdk-collections` - the CRUD / RecordID / query-builder semantics your headless script calls (`getAll`, `update`, `limit/offset`).
- `machhub-sdk-advanced` - Historian, CSV export, and remote-function calls you can also drive from a headless script.
- `machhub-sdk-architecture` - the BaseService/singleton patterns used inside the app; headless scripts deliberately bypass these and call `SDK` directly.
- `machhub-sdk-authentication` - how auth normally works in-app; headless relies entirely on the extension proxy injecting the logged-in session.
- `machhub-runtime-query` - the READ-ONLY sibling: same `:61888` connection, but for answering a data question rather than mutating. Reach for it first when nothing needs writing.
- `machhub-sdk-processes` - for recurring/scheduled server-side jobs, prefer a MACHHUB **Process** over an ad-hoc headless script; use this skill only for one-off local ops.
