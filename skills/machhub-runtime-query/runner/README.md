# runner/ — execution harness

Plain ESM (`.mjs`) run with **Node** (v18+; you have v22). No `npm install`, no `tsx` — it
imports your local `../machhub-sdk-ts/dist` directly.

| File                | Purpose |
| ------------------- | ------- |
| `mch.mjs`           | The harness. Exports `run(fn)`, `getSdk()`, `subscribeFor()`. Read-only SDK, auto-exit. |
| `schema.mjs`        | Dumps live collections/fields/enums + tag/process lists. Run this first. |
| `query.example.mjs` | Copyable template. Copy to `_scratch.mjs`, edit, run. |
| `_*.mjs`            | Your scratch queries (gitignored). |

## Run

```powershell
# 1. See the schema (run from the project root)
node .claude/skills/machhub-runtime-query/runner/schema.mjs
node .claude/skills/machhub-runtime-query/runner/schema.mjs items   # filter to one collection

# 2. Write a query into _scratch.mjs (import './mch.mjs'), then:
node .claude/skills/machhub-runtime-query/runner/_scratch.mjs
```

`run(async (sdk) => ...)` prints whatever you return as JSON to **stdout** and exits 0.
Errors go to **stderr** prefixed `[MCH ERROR]` with exit 1.

## How it connects

`getSdk()` calls `sdk.Initialize({ application_id: '' })`. In Node (no browser) that defaults
to `http://localhost:61888` — the Designer **runtime connection proxy**, which injects the
developer key + `Domain: domains:<app>` into every request. So **no credentials are needed
here**; whichever runtime the Designer is connected to is the one you query.

## Notes / env overrides

- `MACHHUB_SDK_DIST` — absolute path to `machhub-sdk-ts/dist/index.js` if auto-detect fails.
- `MACHHUB_HTTP_URL` — point at a runtime directly (bypass the proxy). You'd then also need
  `MACHHUB_APP_ID` and the SDK would need a dev key — the proxy path is far simpler.
- `MCH_VERBOSE=1` — show the SDK init banner and MQTT noise (debugging).
- MQTT auth fails through the headless proxy (harmless). Live `tag.subscribe` is best-effort;
  use `historian` (HTTP) for recent/historical tag values.
- The harness blocks `create`/`update`/`delete`, `tag.publish`, and `processes.changeTriggers`
  (read-only). `processes.execute()` is allowed but may have side effects — confirm first.
