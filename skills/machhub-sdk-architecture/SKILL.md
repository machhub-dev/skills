---
name: machhub-sdk-architecture
description: How to structure a MACHHUB frontend app — one SDK module, thin per-collection data modules, auth and tag hubs, and components that never touch the SDK directly. Covers the folder layout, typing records, error handling and testing. Use when starting a MACHHUB app or reorganizing one.
license: MPL-2.0
metadata:
  related_skills: "machhub-sdk-initialization, machhub-sdk-collections, machhub-sdk-authentication, machhub-sdk-realtime"
---

## Shape of a MACHHUB app

A MACHHUB app is a **client-only SPA**. MACHHUB hosts it and is its backend, so there is no server layer to design. The structure is just a few layers in the browser:

```
src/lib/machhub/
  sdk.ts          # the only place `new SDK()` and Initialize() happen   (machhub-sdk-initialization)
  auth.ts         # session restore, login, logout                        (machhub-sdk-authentication)
  permissions.ts  # checkAction results, loaded once                      (machhub-sdk-authorization)
  tags.ts         # tag hub: fan-out subscriptions                        (machhub-sdk-realtime)
src/lib/data/
  orders.ts       # one module per collection: typed queries + mutations  (machhub-sdk-collections)
  products.ts
  processes.ts    # wrappers around sdk.processes.execute                 (machhub-sdk-processes)
src/routes | src/pages | src/app
  ...             # UI. Imports from lib/data and lib/machhub, never from '@machhub-dev/sdk-ts' directly
```

Rules:

1. **One SDK instance**, in `sdk.ts`. Everything else calls `getSDK()`.
2. **Components don't call `sdk.*`.** They call functions in `lib/data/*` and the hubs. Then a collection rename, a filter change, or a permission check lives in one place.
3. **No server code, no config.** No API routes, server actions, `.env` URLs, or developer keys (see `machhub-sdk-initialization`).
4. **Keep it thin.** Write a function per real use (`listOpenOrders`, `closeOrder`), not a generic repository or `BaseService` wrapping every SDK method. The SDK *is* the data-access layer.

---

## A data module

```ts
// src/lib/data/orders.ts
import { RecordIDToString, type RecordID } from '@machhub-dev/sdk-ts';
import { getSDK } from '$lib/machhub/sdk';

export type OrderStatus = 'open' | 'released' | 'closed';

export interface Order {
  id: RecordID;
  number: string;
  status: OrderStatus;
  qty: number;
  customerId: RecordID;
  created_dt: string;
}

export async function listOrders(status?: OrderStatus): Promise<Order[]> {
  const sdk = await getSDK();
  let q = sdk.collection('orders').sort('created_dt', 'desc');
  if (status) q = q.filter('status', '=', status);
  return q.getAll();
}

export async function ordersForCustomer(customerId: RecordID): Promise<Order[]> {
  const sdk = await getSDK();
  return sdk.collection('orders').filter('customerId', '=', RecordIDToString(customerId)).getAll();
}

export async function createOrder(data: Omit<Order, 'id' | 'created_dt'>): Promise<Order> {
  const sdk = await getSDK();
  return sdk.collection('orders').create(data);
}

export async function setStatus(order: Order, status: OrderStatus): Promise<void> {
  const sdk = await getSDK();
  await sdk.collection('orders').update(order.id, { status });
}
```

- Records keep `id: RecordID` exactly as returned. Convert with `RecordIDToString` only at the edges: URLs, `<select>` values, Map keys.
- Every function starts a fresh `sdk.collection(...)` builder, because builders keep their filters.
- Types mirror the collection schema (`machhub-collection-json`). Keep them in the data module.

---

## Errors

Let SDK errors propagate from data modules, and handle them where the user sees them:

```ts
try {
  await setStatus(order, 'closed');
  toast.success('Order closed');
} catch (err) {
  toast.error((err as Error).message); // CollectionError messages name the operation and collection
}
```

In one shared place, handle:
- **401**: the session expired. Call `logout()` and send the user to `/login`.
- **403**: the user lacks permission. Show "You don't have access". Use `permissions.ts` to hide those controls up front.

Don't swallow errors into empty arrays. An empty list and a failed load should look different to the user.

---

## State

Use the framework's own state tools around the data modules: React state or context, Svelte runes, Vue refs or composables, Angular signals. Reload after a mutation, or update local state from the value the mutation returned. Don't add a global cache layer until there's a measured need.

---

## Testing

Data modules are the seam. Mock `getSDK` to return a fake with the few methods a test needs:

```ts
vi.mock('$lib/machhub/sdk', () => ({
  getSDK: async () => ({
    collection: () => ({
      filter() { return this; },
      sort() { return this; },
      getAll: async () => [{ id: { Table: 'd.orders', ID: '1' }, status: 'open' }]
    })
  })
}));
```

To check real behaviour end to end, run the app with `npm run dev` against a Designer-connected runtime.
