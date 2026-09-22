---
name: machhub-sveltekit-svelte
description: Build a Svelte 5 + SvelteKit app on MACHHUB — a client-only SPA (adapter-static, ssr off) that talks to MACHHUB through the SDK with zero-config `Initialize()`. Covers SDK setup in the root layout, auth with `sdk.auth` and route guards, rune-based collection and realtime stores, and building for upload. Use for any Svelte or SvelteKit frontend that reads or writes MACHHUB data.
license: MPL-2.0
metadata:
  related_skills: "machhub-sdk-initialization, machhub-sdk-authentication, machhub-sdk-collections, machhub-sdk-realtime"
---

## Read this first

A MACHHUB SvelteKit app is **a static SPA that runs in the browser**. MACHHUB is the backend. It hosts the bundle, serves the SDK its config, and proxies every SDK call to the API. The app never has a server of its own.

The SDK keeps the user's login token in browser `localStorage`. **A SvelteKit server can never make MACHHUB calls for the logged-in user**, because it doesn't have the token. Anything on the server side is dead weight.

**Never do any of these.** They are the mistakes that break MACHHUB apps:

| ❌ Don't | Why it breaks | ✅ Do instead |
|---|---|---|
| `+page.server.ts`, `+layout.server.ts`, `+server.ts`, form actions, `hooks.server.ts` | They need a Node server. adapter-static can't build them, and they have no user token anyway | Call the SDK from `.svelte` / `.svelte.ts` in the browser |
| adapter-node, adapter-auto, an Express/Polka `server.js`, or a backend folder | MACHHUB writes its own `server.js` for SPA uploads. That file serves `/_cfg` and the `/machhub` proxy the SDK depends on | `@sveltejs/adapter-static` with `fallback: 'index.html'` |
| `fetch()` MACHHUB REST URLs by hand (`/collections/...`, `/api/...`) | The URLs and auth headers are the SDK's job, and hand-written ones are wrong | `sdk.collection('x').getAll()` and friends |
| Pass a config to `Initialize(...)`: app ID, `httpUrl`, `mqttUrl`, developer key, `PUBLIC_MACHHUB_*` in `.env` | Hardcoded URLs point at the wrong host once deployed, and a developer key in a bundle is public | `await sdk.Initialize()` with **no arguments** |
| Build your own login: cookies, sessions, JWT parsing, an `auth-token` cookie check | The SDK already stores the MACHHUB JWT and sends it on every call | `sdk.auth.login(username, password)` |
| Rebuild record IDs (`` `myapp.${table}:${id}` ``) or strip them to the bare ID | IDs belong to the server, and a rebuilt one silently misses the record | Pass `record.id` back exactly as the SDK returned it |

If the user asks for something that seems to need a server, like a secret, a scheduled job, or a third-party API call, build it as a **MACHHUB Process** (see `machhub-sdk-processes`) and call it from the app with the SDK.

---

## How zero-config works (so you trust it)

`sdk.Initialize()` with no arguments fetches `/_cfg` from the page's own origin:

- **Local dev** (`npm run dev`): nothing serves `/_cfg`, so the SDK falls back to the **MACHHUB Designer extension** runtime on `localhost:61888`. Keep the Designer extension connected in VS Code, and that is all the setup there is.
- **Deployed on MACHHUB**: MACHHUB's generated `server.js` serves `/_cfg` (runtime ID, port or path hosting) and proxies `/machhub/*` to the API.

So one build works everywhere, with no `.env`.

---

## Setup

```bash
npx sv create my-app        # choose: SvelteKit minimal, TypeScript
cd my-app
npm install @machhub-dev/sdk-ts
npm install -D @sveltejs/adapter-static
```

`svelte.config.js`: static adapter, SPA fallback:

```js
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ fallback: 'index.html' }) // writes build/, which the Designer uploads by default
    // Path hosting only (Application > Hosting Mode = Path, e.g. /myapp):
    // paths: { base: '/myapp' }
  }
};
```

`src/routes/+layout.ts` turns off server rendering for the whole app:

```ts
export const ssr = false;
export const prerender = false;
```

Project layout:

```
src/
  lib/machhub/sdk.ts               # the one place the SDK is created
  lib/machhub/auth.svelte.ts       # auth state (runes)
  lib/machhub/collection.svelte.ts # collection store factory
  lib/machhub/tags.ts              # tag fan-out hub (machhub-sdk-realtime)
  lib/machhub/tag.svelte.ts        # useTag rune wrapper
  routes/+layout.ts                # ssr = false, prerender = false
  routes/+layout.svelte            # initializes the SDK, gates rendering
  routes/login/+page.svelte
  routes/(app)/+layout.ts          # auth guard for everything under (app)
  routes/(app)/+page.svelte
```

There are no `*.server.ts` files, no `+server.ts`, and no `.env`.

---

## SDK

```ts
// src/lib/machhub/sdk.ts
import { SDK } from '@machhub-dev/sdk-ts';

const sdk = new SDK();
let ready: Promise<boolean> | null = null;

/** Initialize once (zero-config: no arguments), then hand out the same SDK. */
export async function getSDK(): Promise<SDK> {
  ready ??= sdk.Initialize();
  if (!(await ready)) {
    ready = null; // allow a retry
    throw new Error('MACHHUB SDK failed to initialize. Is the Designer extension connected?');
  }
  return sdk;
}
```

Initialize it in the root layout, and render nothing until it's ready:

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { getSDK } from '$lib/machhub/sdk';

  let { children } = $props();
  const ready = getSDK();
</script>

{#await ready}
  <p>Connecting to MACHHUB…</p>
{:then}
  {@render children()}
{:catch error}
  <p>{error.message}</p>
{/await}
```

---

## Auth

The SDK stores the JWT and attaches it to every request. The app only tracks *who* is logged in.

```ts
// src/lib/machhub/auth.svelte.ts
import { getSDK } from './sdk';

type User = Awaited<ReturnType<Awaited<ReturnType<typeof getSDK>>['auth']['getCurrentUser']>>;

class Auth {
  user = $state<User | null>(null);
  checked = $state(false);

  /** Restore the session. validateCurrentUser throws when there is no token. */
  async restore(): Promise<User | null> {
    if (this.checked) return this.user;
    const sdk = await getSDK();
    try {
      const { valid } = await sdk.auth.validateCurrentUser();
      this.user = valid ? await sdk.auth.getCurrentUser() : null;
    } catch {
      this.user = null;
    }
    this.checked = true;
    return this.user;
  }

  async login(username: string, password: string) {
    const sdk = await getSDK();
    await sdk.auth.login(username, password); // throws "Login failed: ..." on bad credentials
    this.user = await sdk.auth.getCurrentUser();
    this.checked = true;
  }

  async logout() {
    const sdk = await getSDK();
    await sdk.auth.logout();
    this.user = null;
  }
}

export const auth = new Auth();
```

**Guard** with a universal `+layout.ts`. With `ssr = false` it runs only in the browser, where the token lives:

```ts
// src/routes/(app)/+layout.ts
import { redirect } from '@sveltejs/kit';
import { base } from '$app/paths';
import { auth } from '$lib/machhub/auth.svelte';

export async function load({ url }) {
  if (!(await auth.restore())) {
    redirect(307, `${base}/login?redirectTo=${encodeURIComponent(url.pathname)}`);
  }
}
```

```svelte
<!-- src/routes/login/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { page } from '$app/state';
  import { auth } from '$lib/machhub/auth.svelte';

  let username = $state('');
  let password = $state('');
  let error = $state('');

  async function onsubmit(e: SubmitEvent) {
    e.preventDefault();
    try {
      await auth.login(username, password);
      goto(page.url.searchParams.get('redirectTo') ?? `${base}/`, { replaceState: true });
    } catch (err) {
      error = (err as Error).message;
    }
  }
</script>

<form {onsubmit}>
  <input bind:value={username} autocomplete="username" required />
  <input bind:value={password} type="password" autocomplete="current-password" required />
  {#if error}<p role="alert">{error}</p>{/if}
  <button type="submit">Sign in</button>
</form>
```

Permissions come from the SDK too. There is no `hasPermission`:

```ts
const sdk = await getSDK();
const { actions } = await sdk.auth.checkAction('my_feature', 'domain'); // e.g. ['read', 'read-write']
const canEdit = actions.includes('read-write');
```

See `machhub-sdk-authorization` for features and scopes.

---

## Collections store (runes)

```ts
// src/lib/machhub/collection.svelte.ts
import type { RecordID } from '@machhub-dev/sdk-ts';
import { getSDK } from './sdk';

// Records keep the `id` the SDK returned ({ Table, ID }). Pass it straight back to update/delete.
export class CollectionStore<T extends { id: RecordID }> {
  items = $state<T[]>([]);
  loading = $state(false);
  error = $state<Error | null>(null);

  constructor(private name: string) {}

  async refresh() {
    this.loading = true;
    try {
      const sdk = await getSDK();
      this.items = await sdk.collection(this.name).getAll();
      this.error = null;
    } catch (err) {
      this.error = err as Error;
    } finally {
      this.loading = false;
    }
  }

  async create(data: Omit<T, 'id'>) {
    const sdk = await getSDK();
    await sdk.collection(this.name).create(data as Record<string, unknown>);
    await this.refresh();
  }

  async update(item: T, changes: Partial<Omit<T, 'id'>>) {
    const sdk = await getSDK();
    await sdk.collection(this.name).update(item.id, changes as Record<string, unknown>);
    await this.refresh();
  }

  async remove(item: T) {
    const sdk = await getSDK();
    await sdk.collection(this.name).delete(item.id);
    await this.refresh();
  }
}
```

```svelte
<!-- src/routes/(app)/+page.svelte -->
<script lang="ts">
  import { RecordIDToString, type RecordID } from '@machhub-dev/sdk-ts';
  import { CollectionStore } from '$lib/machhub/collection.svelte';

  type Product = { id: RecordID; name: string; price: number };
  const products = new CollectionStore<Product>('products');
  products.refresh();

  let name = $state('');
  let price = $state(0);

  async function add(e: SubmitEvent) {
    e.preventDefault();
    await products.create({ name, price });
    name = '';
    price = 0;
  }
</script>

<form onsubmit={add}>
  <input bind:value={name} required />
  <input bind:value={price} type="number" required />
  <button>Add</button>
</form>

{#if products.error}
  <p role="alert">{products.error.message}</p>
{/if}
{#each products.items as p (RecordIDToString(p.id))}
  <div>{p.name}: {p.price} <button onclick={() => products.remove(p)}>Delete</button></div>
{/each}
```

Filtering, sorting, expanding relations, and file fields are covered in `machhub-sdk-collections` and `machhub-sdk-file-handling`.

---

## Realtime tags

The SDK keeps **one handler per topic**, so two components subscribing to the same tag directly would knock each other out. Put the fan-out hub from `machhub-sdk-realtime` in `src/lib/machhub/tags.ts`, then wrap it in runes:

```ts
// src/lib/machhub/tag.svelte.ts
import { watchTag } from './tags';

/** Call inside a component's <script>. Unsubscribes when the component is destroyed. */
export function useTag<T = unknown>(topic: string) {
  const state = $state<{ value: T | null }>({ value: null });

  $effect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    watchTag(topic, (v) => (state.value = v as T)).then((s) => (cancelled ? s() : (stop = s)));
    return () => { cancelled = true; stop?.(); };
  });

  return state;
}
```

```svelte
<script lang="ts">
  import { useTag } from '$lib/machhub/tag.svelte';
  const temperature = useTag<number>('plant/line1/temperature');
</script>

<p>{temperature.value ?? '—'} °C</p>
```

Publishing: `writeTag(topic, value)` from the hub, which is `sdk.tag.publish` and retained by default. There is no `sdk.tagging(...)`.

---

## Build and deploy

```bash
npm run build   # adapter-static writes build/ with index.html at the top level
```

Upload with the Designer extension. It uploads the contents of `build/` by default (the **Build Folder Path** setting in the runtime profile). On the Applications page, set **Application Type = SPA**. Don't add a `server.js` or a start script, because MACHHUB supplies both.

- **Port hosting**: nothing else to do.
- **Path hosting** (e.g. `/myapp`): set `kit.paths.base: '/myapp'` before building, and build links with `base` from `$app/paths` so they keep the prefix.

---

## Checklist before you finish

- [ ] `sdk.Initialize()` is called once, with **no arguments**
- [ ] `adapter-static` with `fallback: 'index.html'`, and `ssr = false` in the root `+layout.ts`
- [ ] No `*.server.ts`, `+server.ts`, form actions, `hooks.server.ts`, or custom server
- [ ] No MACHHUB URLs, app IDs, or developer keys in code or `.env`
- [ ] Login uses `sdk.auth.login`, and guards live in a universal `+layout.ts`
- [ ] Record IDs are passed back as returned, never rebuilt or stripped
- [ ] Tag subscriptions unsubscribe on destroy
- [ ] `build/` uploads as an **SPA**
