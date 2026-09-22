---
name: machhub-sdk-initialization
description: Initialize the MACHHUB TypeScript SDK (`@machhub-dev/sdk-ts`). Browser apps hosted on MACHHUB call `Initialize()` with no arguments, and it works in local dev (through the Designer extension) and once deployed. Covers how that discovery works, the one-SDK-per-app rule, and the narrow case for explicit config with an API key (Node scripts and external services).
license: MPL-2.0
metadata:
  related_skills: "machhub-sdk-architecture, machhub-sdk-collections, machhub-sdk-authentication, machhub-sdk-realtime, machhub-headless-sdk"
---

## The rule

**A browser app hosted on MACHHUB calls `sdk.Initialize()` with no arguments.** That is the whole setup, in development and once deployed. There are no environment variables, app IDs, or URLs.

```ts
import { SDK } from '@machhub-dev/sdk-ts';

const sdk = new SDK();
const ok = await sdk.Initialize(); // true when connected
```

Don't give a browser app `application_id`, `httpUrl`, `mqttUrl`, or `developer_key`, whether from `.env`, `VITE_*`, `NEXT_PUBLIC_*`, `PUBLIC_*`, `NUXT_PUBLIC_*`, or Angular `environment.ts`. Hardcoded URLs point at the wrong place after deployment, and an API key in a browser bundle is readable by anyone.

---

## How zero-config discovery works

`Initialize()` with no config does this (from the SDK source):

1. **In a browser**, it looks for `/_cfg` on the page's own origin (and on parent path segments, for path hosting). A valid answer is JSON with `port`, `runtimeID`, and optionally `hostingMode` and `pathHosted`.
2. **If no `/_cfg` answers** (local `npm run dev`, or Node with no `window`), it falls back to port **61888** on the page's hostname (`localhost` in Node). That is the **MACHHUB Designer extension** runtime proxy in VS Code, which handles credentials for you.
3. The application ID comes from the runtime ID, and HTTP calls go to `<host>/machhub/...`. MQTT goes to `ws(s)://<host>/mqtt`.

Where `/_cfg` comes from:

| Where the app runs | Who serves `/_cfg` and `/machhub` |
|---|---|
| `npm run dev` on your machine | Nobody, so the SDK falls back to the Designer on `localhost:61888`. Keep the Designer connected to a runtime |
| Uploaded to MACHHUB as an **SPA** | MACHHUB's generated `server.js`, which replaces any `server.js` you upload |
| Uploaded to MACHHUB as **SSR** | MACHHUB's proxy wrapper in front of your node server |

So **the app must not ship its own server**. A custom Express/Next/SvelteKit server doesn't serve `/_cfg` and doesn't proxy `/machhub`. The framework skills (`machhub-nextjs-react`, `machhub-sveltekit-svelte`, `machhub-nuxt-vue`, `machhub-angular`) show the client-only setup for each framework.

---

## One SDK per app

Create the SDK once and share it. Call `Initialize()` once; concurrent callers share the same promise.

```ts
// src/lib/machhub/sdk.ts
import { SDK } from '@machhub-dev/sdk-ts';

const sdk = new SDK();
let ready: Promise<boolean> | null = null;

export async function getSDK(): Promise<SDK> {
  ready ??= sdk.Initialize();
  if (!(await ready)) {
    ready = null; // allow a retry
    throw new Error('MACHHUB SDK failed to initialize. Is the Designer extension connected?');
  }
  return sdk;
}
```

```ts
// anywhere
const sdk = await getSDK();
const rows = await sdk.collection('products').getAll();
```

❌ Don't do `new SDK()` + `Initialize()` inside each function. Every instance opens its own MQTT connection.

Accessing `sdk.auth`, `sdk.tag`, `sdk.historian`, `sdk.processes`, `sdk.collection(...)` or `sdk.bridge(...)` before `Initialize()` resolves throws `SDK is not initialized`.

---

## Explicit config: only outside a MACHHUB app

`Initialize(config)` accepts:

```ts
interface SDKConfig {
  application_id: string;   // the domain ID, e.g. 'my_app'
  developer_key?: string;   // an API key; sent as X-Machhub-Api-Key and as the MQTT password
  httpUrl?: string;         // base URL; the SDK appends /machhub
  mqttUrl?: string;         // e.g. wss://host/mqtt
}
```

There is no `natsUrl`.

Use it **only** for code that isn't a browser app served by MACHHUB:

- **Node scripts on a dev machine with the Designer connected**: you don't need an API key. Pass `application_id` only, and the SDK uses the Designer proxy on `localhost:61888`. See `machhub-headless-sdk`.
- **A service elsewhere** (a CI job, another backend) calling a remote MACHHUB: pass `application_id`, `httpUrl`, `mqttUrl`, and an **API key** created in MACHHUB (Account > API Keys). Keep the key in that service's secret store, never in a frontend bundle.

```ts
// Node service, not a browser app
const ok = await sdk.Initialize({
  application_id: 'my_app',
  httpUrl: 'https://machhub.example.com',
  mqttUrl: 'wss://machhub.example.com/mqtt',
  developer_key: process.env.MACHHUB_API_KEY
});
```

In Node there is no `localStorage`, so `sdk.auth.login()` keeps its token in memory for the life of the process.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| `Initialize()` returns `false` in dev | The Designer extension isn't connected to a runtime, so nothing is on `localhost:61888` |
| Works in dev, fails after upload | The app shipped its own server, hardcoded URLs, or was uploaded as the wrong Application Type. Upload the static build as **SPA** |
| Works on port hosting, 404s on path hosting | Assets or routes assume `/`. Build with relative assets and set the router base (see the framework skill) |
| `SDK is not initialized` | Something used the SDK before `Initialize()` resolved. Gate rendering on the init promise |
| Calls return 401 | Not logged in. Use `sdk.auth.login()` (see `machhub-sdk-authentication`) |
