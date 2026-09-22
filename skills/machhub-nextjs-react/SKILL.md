---
name: machhub-nextjs-react
description: Build a React app on MACHHUB — a client-only Vite SPA (or a Next.js static export) that talks to MACHHUB through the SDK with zero-config `Initialize()`. Covers the SDK provider, auth with `sdk.auth`, collection and realtime hooks, route guards, and building for upload. Use for any React or Next.js frontend that reads or writes MACHHUB data.
license: MPL-2.0
metadata:
  related_skills: "machhub-sdk-initialization, machhub-sdk-authentication, machhub-sdk-collections, machhub-sdk-realtime"
---

## Read this first

A MACHHUB React app is **a static bundle that runs in the browser**. MACHHUB is the backend. It hosts the bundle, serves the SDK its config, and proxies every SDK call to the API. The app never has a server of its own.

**Never do any of these.** They are the mistakes that break MACHHUB apps:

| ❌ Don't | Why it breaks | ✅ Do instead |
|---|---|---|
| Write an Express/Fastify/Node server, `server.js`, or a backend folder | MACHHUB writes its own `server.js` into the upload and overwrites yours. That file serves `/_cfg` and the `/machhub` proxy the SDK depends on | Ship only the build output |
| Add Next.js API routes (`app/api/*`, `pages/api/*`), Server Actions (`'use server'`), or `middleware.ts` | They need a Node server, and a static export has none. They also tempt you into calling MACHHUB with a developer key from the server | Call the SDK from client components |
| `fetch()` MACHHUB REST URLs by hand (`/collections/...`, `/api/...`) | The URLs and auth headers are the SDK's job, and hand-written ones are wrong | `sdk.collection('x').getAll()` and friends |
| Pass a config to `Initialize(...)`: app ID, `httpUrl`, `mqttUrl`, developer key, `.env` / `VITE_*` / `NEXT_PUBLIC_*` vars | Hardcoded URLs point at the wrong host once deployed, and a developer key in a bundle is public | `await sdk.Initialize()` with **no arguments** |
| Build your own login: cookies, sessions, JWT parsing, password checks | The SDK already stores the MACHHUB JWT and sends it on every call | `sdk.auth.login(username, password)` |
| Rebuild record IDs (`` `myapp.${table}:${id}` ``) | IDs belong to the server, and a rebuilt one silently misses the record | Pass `record.id` back exactly as the SDK returned it |

If the user asks for something that seems to need a server, like a secret, a scheduled job, or a third-party API call, build it as a **MACHHUB Process** (see `machhub-sdk-processes`) and call it from the app with the SDK.

---

## How zero-config works (so you trust it)

`sdk.Initialize()` with no arguments fetches `/_cfg` from the page's own origin:

- **Local dev** (`npm run dev`): nothing serves `/_cfg`, so the SDK falls back to the **MACHHUB Designer extension** runtime on `localhost:61888`. Keep the Designer extension connected in VS Code, and that is all the setup there is.
- **Deployed on MACHHUB**: MACHHUB's generated `server.js` serves `/_cfg` (runtime ID, port or path hosting) and proxies `/machhub/*` to the API. The same bundle works on a port or behind a path like `/myapp` without any change.

So one build works everywhere, with no environment files.

---

## Stack

**Default: Vite + React + TypeScript, with React Router for pages.** Use Next.js only when the user asks for it, and then only as a static export (see [Next.js](#nextjs-only-if-asked)).

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install @machhub-dev/sdk-ts react-router-dom
```

`vite.config.ts` needs `base: './'` so assets load under both port and path hosting, and `outDir: 'build'` because that is the folder the Designer extension uploads by default:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'build' }
});
```

Project layout:

```
src/
  main.tsx                 # mounts <SDKProvider> + router
  machhub/sdk-context.tsx  # the one place the SDK is created (getSDK + <SDKProvider>)
  machhub/tags.ts          # tag fan-out hub (machhub-sdk-realtime)
  machhub/use-auth.tsx     # auth state + <RequireAuth>
  hooks/use-collection.ts
  hooks/use-tag.ts
  pages/...
```

There is no `server/`, no `api/`, and no `.env`.

---

## SDK provider

Create the SDK once, initialize it once, and render nothing that uses it until it's ready.

```tsx
// src/machhub/sdk-context.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { SDK } from '@machhub-dev/sdk-ts';

type SDKState = { sdk: SDK | null; error: Error | null };

const SDKContext = createContext<SDKState>({ sdk: null, error: null });

// Module-level so React StrictMode's double effect run can't initialize twice.
const sdk = new SDK();
let ready: Promise<boolean> | null = null;

/** Initialize once (zero-config: no arguments) and return the SDK. Usable outside components too (e.g. the tag hub). */
export async function getSDK(): Promise<SDK> {
  ready ??= sdk.Initialize();
  if (!(await ready)) {
    ready = null; // allow a retry
    throw new Error('MACHHUB SDK failed to initialize. Is the Designer extension connected?');
  }
  return sdk;
}

export function SDKProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SDKState>({ sdk: null, error: null });

  useEffect(() => {
    getSDK().then(
      (s) => setState({ sdk: s, error: null }),
      (err) => setState({ sdk: null, error: err as Error })
    );
  }, []);

  if (state.error) return <p>{state.error.message}</p>;
  if (!state.sdk) return <p>Connecting to MACHHUB…</p>;
  return <SDKContext.Provider value={state}>{children}</SDKContext.Provider>;
}

/** The initialized SDK. Only valid inside <SDKProvider>, which gates rendering until ready. */
export function useSDK(): SDK {
  const { sdk } = useContext(SDKContext);
  if (!sdk) throw new Error('useSDK must be used inside <SDKProvider>');
  return sdk;
}
```

---

## Auth

The SDK stores the JWT (in `localStorage`) and attaches it to every request. The app only tracks *who* is logged in.

```tsx
// src/machhub/use-auth.tsx
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSDK } from './sdk-context';

type User = Awaited<ReturnType<ReturnType<typeof useSDK>['auth']['getCurrentUser']>>;

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const sdk = useSDK();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the session on load. validateCurrentUser throws when there is no token.
  useEffect(() => {
    (async () => {
      try {
        const { valid } = await sdk.auth.validateCurrentUser();
        setUser(valid ? await sdk.auth.getCurrentUser() : null);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [sdk]);

  const login = useCallback(async (username: string, password: string) => {
    await sdk.auth.login(username, password); // throws "Login failed: ..." on bad credentials
    setUser(await sdk.auth.getCurrentUser());
  }, [sdk]);

  const logout = useCallback(async () => {
    await sdk.auth.logout();
    setUser(null);
  }, [sdk]);

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Wrap private routes. Guards run in the browser because that is where the token lives. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
}
```

Permissions come from the SDK too. There is no `hasPermission`:

```ts
const { actions } = await sdk.auth.checkAction('my_feature', 'domain'); // e.g. ['read', 'read-write']
const canEdit = actions.includes('read-write');
```

See `machhub-sdk-authorization` for features and scopes.

---

## Wiring it up

```tsx
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { SDKProvider } from './machhub/sdk-context';
import { AuthProvider, RequireAuth } from './machhub/use-auth';
import LoginPage from './pages/login';
import ProductsPage from './pages/products';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SDKProvider>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<RequireAuth><ProductsPage /></RequireAuth>} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </SDKProvider>
  </StrictMode>
);
```

Use **`HashRouter`**. It works unchanged under both port and path hosting. `BrowserRouter` also works on port hosting because MACHHUB falls back to `index.html`, but under path hosting it needs `basename` set to the app's path.

```tsx
// src/pages/login.tsx
import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../machhub/use-auth';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await login(String(form.get('username')), String(form.get('password')));
      navigate(from, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <input name="username" autoComplete="username" required />
      <input name="password" type="password" autoComplete="current-password" required />
      {error && <p role="alert">{error}</p>}
      <button type="submit">Sign in</button>
    </form>
  );
}
```

---

## Collections hook

```ts
// src/hooks/use-collection.ts
import { useCallback, useEffect, useState } from 'react';
import type { RecordID } from '@machhub-dev/sdk-ts';
import { useSDK } from '../machhub/sdk-context';

// Records keep the `id` the SDK returned ({ Table, ID }). Pass it straight back to update/delete.
// For a React key, use RecordIDToString(item.id).
export function useCollection<T extends { id: RecordID }>(name: string) {
  const sdk = useSDK();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await sdk.collection(name).getAll());
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [sdk, name]);

  useEffect(() => { refresh(); }, [refresh]);

  const create = async (data: Omit<T, 'id'>) => {
    await sdk.collection(name).create(data as Record<string, unknown>);
    await refresh();
  };
  const update = async (item: T, changes: Partial<Omit<T, 'id'>>) => {
    await sdk.collection(name).update(item.id, changes as Record<string, unknown>);
    await refresh();
  };
  const remove = async (item: T) => {
    await sdk.collection(name).delete(item.id);
    await refresh();
  };

  return { items, loading, error, refresh, create, update, remove };
}
```

Filtering, sorting, expanding relations, and file fields are covered in `machhub-sdk-collections` and `machhub-sdk-file-handling`.

---

## Realtime tags

The SDK keeps **one handler per topic**, so two components subscribing to the same tag directly would knock each other out. Put the fan-out hub from `machhub-sdk-realtime` in `src/machhub/tags.ts`, importing `getSDK` from `./sdk-context`, then wrap it:

```ts
// src/hooks/use-tag.ts
import { useEffect, useState } from 'react';
import { watchTag, writeTag } from '../machhub/tags';

export function useTag<T = unknown>(topic: string) {
  const [value, setValue] = useState<T | null>(null);

  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    watchTag(topic, (v) => setValue(v as T)).then((s) => (cancelled ? s() : (stop = s)));
    return () => { cancelled = true; stop?.(); };
  }, [topic]);

  return { value, publish: (v: T) => writeTag(topic, v) };
}
```

---

## Build and deploy

```bash
npm run build   # outputs build/ (index.html at the top level)
```

Upload with the Designer extension. It uploads the contents of `build/` by default (the **Build Folder Path** setting in the runtime profile). On the Applications page, set **Application Type = SPA**. Don't add a `server.js` or a start script, because MACHHUB supplies both.

---

## Next.js (only if asked)

Next.js works only as a **static export**, which makes it the same client-only SPA as above:

```js
// next.config.mjs
export default { output: 'export', trailingSlash: true, images: { unoptimized: true } };
```

- Mark every component that touches the SDK with `'use client'`. The SDK never runs on the server.
- Put `SDKProvider` and `AuthProvider` in a client component that `app/layout.tsx` renders.
- Guard pages in the client with `useRouter().replace('/login')` inside an effect. Don't use `middleware.ts`.
- **Not allowed:** `app/api/**`, `pages/api/**`, `'use server'`, `middleware.ts`, `getServerSideProps`, `cookies()`/`headers()`, or any `NEXT_PUBLIC_MACHHUB_*` variable. A static export either can't build these or can't run them.
- `npm run build` writes `out/`. Set the Designer's **Build Folder Path** to `out`, then upload it as an SPA.

---

## Checklist before you finish

- [ ] `sdk.Initialize()` is called once, with **no arguments**
- [ ] No server code: no `server.js`, Express, API routes, Server Actions, or `middleware.ts`
- [ ] No MACHHUB URLs, app IDs, or developer keys in code or `.env`
- [ ] Login uses `sdk.auth.login`, and guards run client-side
- [ ] Record IDs are passed back as returned, never rebuilt
- [ ] Tag subscriptions unsubscribe in effect cleanup
- [ ] `vite.config.ts` has `base: './'` and `outDir: 'build'` (or Next has `output: 'export'`)
- [ ] The build output uploads as an **SPA**
