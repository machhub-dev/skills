---
name: machhub-angular
description: Build an Angular app on MACHHUB — a client-only SPA that talks to MACHHUB through the SDK with zero-config `Initialize()`. Covers initializing the SDK before bootstrap, an auth service and functional route guard, signal-based collection and tag services, and building for upload. Use for any Angular frontend that reads or writes MACHHUB data.
license: MPL-2.0
metadata:
  related_skills: "machhub-sdk-initialization, machhub-sdk-authentication, machhub-sdk-collections, machhub-sdk-realtime"
---

## Read this first

A MACHHUB Angular app is **a static SPA that runs in the browser**. MACHHUB hosts it, serves the SDK its config, and proxies every SDK call. The app has no server of its own.

| ❌ Don't | ✅ Do instead |
|---|---|
| Angular SSR (`@angular/ssr`), an Express `server.ts`, or any Node backend | A plain browser build. MACHHUB writes its own `server.js` for SPA uploads |
| MACHHUB URLs, app IDs, or developer keys in `environment.ts` | `sdk.Initialize()` with **no arguments** |
| `HttpClient` calls to MACHHUB REST paths | SDK methods (`sdk.collection(...)`, `sdk.auth`, `sdk.tag`) |
| Your own login, cookies, or JWT interceptor | `sdk.auth.login()`. The SDK stores the token and sends it |
| Rebuilding record IDs (`` `myapp.orders:${id}` ``) | Pass `record.id` back as returned (see `machhub-sdk-collections`) |

Anything that seems to need a server (secrets, schedules, third-party APIs) becomes a **MACHHUB Process** (`machhub-sdk-processes`).

Zero-config works everywhere. `ng serve` has no `/_cfg`, so the SDK uses the Designer extension on `localhost:61888`. Once deployed, MACHHUB serves `/_cfg`. See `machhub-sdk-initialization`.

---

## Setup

```bash
ng new my-app --ssr=false --routing --style=css
cd my-app
npm install @machhub-dev/sdk-ts
```

In `angular.json`, make the build land directly in `build/`, because the Designer extension uploads that folder by default:

```jsonc
"architect": {
  "build": {
    "options": {
      "outputPath": { "base": "build", "browser": "" }
    }
  }
}
```

In `src/index.html`, set `<base href="./">` so assets resolve under both port and path hosting.

---

## SDK service

```ts
// src/app/machhub/sdk.service.ts
import { Injectable } from '@angular/core';
import { SDK } from '@machhub-dev/sdk-ts';

@Injectable({ providedIn: 'root' })
export class MachhubSdk {
  readonly sdk = new SDK();

  /** Runs once before the app renders (see app.config.ts). */
  async init(): Promise<void> {
    if (!(await this.sdk.Initialize())) { // no arguments: zero-config
      throw new Error('MACHHUB SDK failed to initialize. Is the Designer extension connected?');
    }
  }
}
```

```ts
// src/app/app.config.ts
import { ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app.routes';
import { MachhubSdk } from './machhub/sdk.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withHashLocation()), // works unchanged under port and path hosting
    provideAppInitializer(() => inject(MachhubSdk).init())
  ]
};
```

Because the initializer finishes before any component is created, services can use `inject(MachhubSdk).sdk` synchronously. (On Angular versions before 19, use an `APP_INITIALIZER` provider with a factory that returns `() => sdk.init()`.)

---

## Auth

```ts
// src/app/machhub/auth.service.ts
import { Injectable, inject, signal } from '@angular/core';
import type { User } from '@machhub-dev/sdk-ts';
import { MachhubSdk } from './sdk.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private sdk = inject(MachhubSdk).sdk;
  readonly user = signal<User | null>(null);
  private restored: Promise<User | null> | null = null;

  /** Restore the session once. validateCurrentUser throws when there is no token. */
  restore(): Promise<User | null> {
    this.restored ??= (async () => {
      try {
        const { valid } = await this.sdk.auth.validateCurrentUser();
        this.user.set(valid ? await this.sdk.auth.getCurrentUser() : null);
      } catch {
        this.user.set(null);
      }
      return this.user();
    })();
    return this.restored;
  }

  async login(username: string, password: string) {
    await this.sdk.auth.login(username, password); // throws "Login failed: ..." on bad credentials
    this.user.set(await this.sdk.auth.getCurrentUser());
    this.restored = Promise.resolve(this.user());
  }

  async logout() {
    await this.sdk.auth.logout();
    this.user.set(null);
    this.restored = Promise.resolve(null);
  }
}
```

```ts
// src/app/machhub/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const user = await inject(AuthService).restore();
  return user ? true : inject(Router).createUrlTree(['/login'], { queryParams: { redirectTo: state.url } });
};
```

```ts
// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './machhub/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./login.component').then((m) => m.LoginComponent) },
  { path: '', canActivate: [authGuard], loadComponent: () => import('./orders.component').then((m) => m.OrdersComponent) }
];
```

Permissions use `sdk.auth.checkAction(feature, scope)` (see `machhub-sdk-authorization`). There is no `hasPermission`.

---

## Collections

```ts
// src/app/data/orders.service.ts
import { Injectable, inject, signal } from '@angular/core';
import type { RecordID } from '@machhub-dev/sdk-ts';
import { MachhubSdk } from '../machhub/sdk.service';

export interface Order { id: RecordID; number: string; status: 'open' | 'closed'; qty: number }

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private sdk = inject(MachhubSdk).sdk;
  readonly orders = signal<Order[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async load() {
    this.loading.set(true);
    try {
      // a fresh builder per query
      this.orders.set(await this.sdk.collection('orders').filter('status', '=', 'open').sort('created_dt', 'desc').getAll());
      this.error.set(null);
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  async create(data: Omit<Order, 'id'>) {
    await this.sdk.collection('orders').create(data);
    await this.load();
  }

  async close(order: Order) {
    await this.sdk.collection('orders').update(order.id, { status: 'closed' }); // pass the id as returned
    await this.load();
  }
}
```

```ts
// src/app/orders.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { RecordIDToString } from '@machhub-dev/sdk-ts';
import { OrdersService } from './data/orders.service';

@Component({
  selector: 'app-orders',
  template: `
    @if (svc.error(); as e) { <p role="alert">{{ e }}</p> }
    @for (o of svc.orders(); track key(o)) {
      <div>{{ o.number }} · {{ o.qty }} <button (click)="svc.close(o)">Close</button></div>
    } @empty { <p>No open orders</p> }
  `
})
export class OrdersComponent implements OnInit {
  svc = inject(OrdersService);
  key = (o: { id: Parameters<typeof RecordIDToString>[0] }) => RecordIDToString(o.id);
  ngOnInit() { this.svc.load(); }
}
```

---

## Live tags

Use the fan-out hub from `machhub-sdk-realtime` (put `watchTag` in `src/app/machhub/tags.ts`, with `getSDK` returning `inject(MachhubSdk).sdk`), and unsubscribe when the component is destroyed:

```ts
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { watchTag } from './machhub/tags';

@Component({ selector: 'app-temp', template: `<p>{{ value() ?? '—' }} °C</p>` })
export class TempComponent {
  value = signal<number | null>(null);
  constructor() {
    const destroyRef = inject(DestroyRef);
    watchTag('PlantA/Line1/Temperature', (v) => this.value.set(v as number)).then((stop) => destroyRef.onDestroy(stop));
  }
}
```

The SDK's `tag.unsubscribe` takes one topic string, and a topic has only one SDK handler. That's why components go through the hub.

---

## Build and deploy

```bash
ng build   # writes build/ with index.html at the top level
```

Upload `build/` with the Designer extension and set **Application Type = SPA** on the Applications page. Don't add a `server.js`.

---

## Checklist

- [ ] `Initialize()` runs once, with no arguments, in `provideAppInitializer`
- [ ] No SSR, `server.ts`, `HttpClient` calls to MACHHUB, or MACHHUB values in `environment.ts`
- [ ] Login uses `sdk.auth`, and routes are guarded with `authGuard`
- [ ] Record IDs are passed back as returned
- [ ] Tag subscriptions go through the hub and stop on destroy
- [ ] `outputPath` is `build`, with `<base href="./">` and hash routing
- [ ] Uploaded as an **SPA**
