---
name: machhub-nuxt-vue
description: "Build a Vue 3 app on MACHHUB — a client-only Vite SPA (or Nuxt with `ssr: false`, statically generated) that talks to MACHHUB through the SDK with zero-config `Initialize()`. Covers initializing before mount, auth composable and router guard, collection and tag composables, and building for upload. Use for any Vue or Nuxt frontend that reads or writes MACHHUB data."
license: MPL-2.0
metadata:
  related_skills: "machhub-sdk-initialization, machhub-sdk-authentication, machhub-sdk-collections, machhub-sdk-realtime"
---

## Read this first

A MACHHUB Vue app is **a static SPA that runs in the browser**. MACHHUB hosts it, serves the SDK its config, and proxies every SDK call. The app has no server of its own.

| ❌ Don't | ✅ Do instead |
|---|---|
| Nuxt server features: `server/api/*`, `server/middleware`, server-only `runtimeConfig`, SSR | A client-only build. MACHHUB writes its own `server.js` for SPA uploads |
| `NUXT_PUBLIC_MACHHUB_*` / `VITE_MACHHUB_*` URLs, app IDs, or developer keys | `sdk.Initialize()` with **no arguments** |
| `$fetch` / `fetch` to MACHHUB REST paths | SDK methods (`sdk.collection(...)`, `sdk.auth`, `sdk.tag`) |
| Your own login, cookies, or `auth-token` checks | `sdk.auth.login()`. The SDK stores the token and sends it |
| Rebuilding record IDs (`` `myapp.orders:${id}` ``) | Pass `record.id` back as returned (see `machhub-sdk-collections`) |

Anything that seems to need a server (secrets, schedules, third-party APIs) becomes a **MACHHUB Process** (`machhub-sdk-processes`).

Zero-config works everywhere. The dev server has no `/_cfg`, so the SDK uses the Designer extension on `localhost:61888`. Once deployed, MACHHUB serves `/_cfg`. See `machhub-sdk-initialization`.

---

## Stack

**Default: Vite + Vue 3 + TypeScript + Vue Router.** Use Nuxt only if the user asks for it (see [Nuxt](#nuxt-only-if-asked)).

```bash
npm create vite@latest my-app -- --template vue-ts
cd my-app
npm install @machhub-dev/sdk-ts vue-router
```

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  base: './',                 // assets work under port and path hosting
  build: { outDir: 'build' }  // the folder the Designer extension uploads by default
});
```

---

## SDK: initialize before mount

```ts
// src/machhub/sdk.ts
import { SDK } from '@machhub-dev/sdk-ts';

export const sdk = new SDK();

export async function initSDK() {
  if (!(await sdk.Initialize())) { // no arguments: zero-config
    throw new Error('MACHHUB SDK failed to initialize. Is the Designer extension connected?');
  }
}
```

```ts
// src/main.ts
import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import { initSDK } from './machhub/sdk';

initSDK()
  .then(() => createApp(App).use(router).mount('#app'))
  .catch((err) => { document.getElementById('app')!.textContent = err.message; });
```

Because nothing mounts until the SDK is ready, every component and composable can use `sdk` directly.

---

## Auth

```ts
// src/machhub/useAuth.ts
import { ref, readonly } from 'vue';
import type { User } from '@machhub-dev/sdk-ts';
import { sdk } from './sdk';

const user = ref<User | null>(null);
let restored: Promise<User | null> | null = null;

export function useAuth() {
  /** Restore the session once. validateCurrentUser throws when there is no token. */
  function restore() {
    restored ??= (async () => {
      try {
        const { valid } = await sdk.auth.validateCurrentUser();
        user.value = valid ? await sdk.auth.getCurrentUser() : null;
      } catch {
        user.value = null;
      }
      return user.value;
    })();
    return restored;
  }

  async function login(username: string, password: string) {
    await sdk.auth.login(username, password); // throws "Login failed: ..." on bad credentials
    user.value = await sdk.auth.getCurrentUser();
    restored = Promise.resolve(user.value);
  }

  async function logout() {
    await sdk.auth.logout();
    user.value = null;
    restored = Promise.resolve(null);
  }

  return { user: readonly(user), restore, login, logout };
}
```

```ts
// src/router.ts
import { createRouter, createWebHashHistory } from 'vue-router';
import { useAuth } from './machhub/useAuth';

export const router = createRouter({
  history: createWebHashHistory(), // works unchanged under port and path hosting
  routes: [
    { path: '/login', component: () => import('./pages/Login.vue') },
    { path: '/', component: () => import('./pages/Orders.vue'), meta: { auth: true } }
  ]
});

router.beforeEach(async (to) => {
  if (to.meta.auth && !(await useAuth().restore())) {
    return { path: '/login', query: { redirectTo: to.fullPath } };
  }
});
```

Permissions use `sdk.auth.checkAction(feature, scope)` (see `machhub-sdk-authorization`). There is no `hasPermission`.

---

## Collections

```ts
// src/data/useOrders.ts
import { ref } from 'vue';
import type { RecordID } from '@machhub-dev/sdk-ts';
import { sdk } from '../machhub/sdk';

export interface Order { id: RecordID; number: string; status: 'open' | 'closed'; qty: number }

export function useOrders() {
  const orders = ref<Order[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function load() {
    loading.value = true;
    try {
      // a fresh builder per query
      orders.value = await sdk.collection('orders').filter('status', '=', 'open').sort('created_dt', 'desc').getAll();
      error.value = null;
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  }

  async function close(order: Order) {
    await sdk.collection('orders').update(order.id, { status: 'closed' }); // pass the id as returned
    await load();
  }

  return { orders, loading, error, load, close };
}
```

```vue
<!-- src/pages/Orders.vue -->
<script setup lang="ts">
import { onMounted } from 'vue';
import { RecordIDToString } from '@machhub-dev/sdk-ts';
import { useOrders } from '../data/useOrders';

const { orders, error, load, close } = useOrders();
onMounted(load);
</script>

<template>
  <p v-if="error" role="alert">{{ error }}</p>
  <div v-for="o in orders" :key="RecordIDToString(o.id)">
    {{ o.number }} · {{ o.qty }} <button @click="close(o)">Close</button>
  </div>
</template>
```

---

## Live tags

Use the fan-out hub from `machhub-sdk-realtime` (put `watchTag` in `src/machhub/tags.ts`, where its `getSDK` can just return `sdk`):

```ts
// src/machhub/useTag.ts
import { ref, onUnmounted } from 'vue';
import { watchTag } from './tags';

export function useTag<T = unknown>(topic: string) {
  const value = ref<T | null>(null);
  let stop: (() => void) | undefined;
  let unmounted = false;
  watchTag(topic, (v) => (value.value = v as T)).then((s) => (unmounted ? s() : (stop = s)));
  onUnmounted(() => { unmounted = true; stop?.(); });
  return value;
}
```

A topic has only one SDK handler, and `tag.unsubscribe` takes one topic string. That's why components go through the hub.

---

## Build and deploy

```bash
npm run build   # writes build/ with index.html at the top level
```

Upload `build/` with the Designer extension and set **Application Type = SPA** on the Applications page. Don't add a `server.js`.

---

## Nuxt (only if asked)

Nuxt works as a **client-only static build**:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  ssr: false,
  app: { baseURL: '/' },  // port hosting; for path hosting use the path, e.g. '/myapp/'
  router: { options: { hashMode: true } }
});
```

- Initialize the SDK in a **client plugin** (`plugins/machhub.client.ts`) that `await`s `sdk.Initialize()` and `provide`s it. Use the same `useAuth` and `useOrders` as above.
- Guard pages with a client route middleware (`defineNuxtRouteMiddleware`) that calls `useAuth().restore()`.
- **Not allowed:** `server/` routes or middleware, server-only `runtimeConfig`, or `NUXT_PUBLIC_MACHHUB_*`.
- `npx nuxi generate` writes `.output/public/`. Set the Designer's **Build Folder Path** to `.output/public`, then upload it as an SPA.

---

## Checklist

- [ ] `Initialize()` runs once, with no arguments, before mount
- [ ] No server code, `$fetch` to MACHHUB, or MACHHUB values in env or runtime config
- [ ] Login uses `sdk.auth`, and routes are guarded in `router.beforeEach` or client middleware
- [ ] Record IDs are passed back as returned
- [ ] Tag subscriptions go through the hub and stop on unmount
- [ ] `base: './'` and `outDir: 'build'` (Vite), or `ssr: false` plus generate (Nuxt)
- [ ] Uploaded as an **SPA**
