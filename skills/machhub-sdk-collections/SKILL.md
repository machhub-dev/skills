---
name: machhub-sdk-collections
description: Read and write MACHHUB collection records with the SDK — create, getAll, getOne, update, delete, count, filters (including inside JSON arrays), sorting, paging, expanding relations, and the record ID format. Use for any code that queries or changes collection data from an app.
license: MPL-2.0
metadata:
  related_skills: "machhub-sdk-initialization, machhub-sdk-file-handling, machhub-collection-json"
---

## Record IDs: read this first

Collections live in per-domain tables named `<domainId>.<collection>`. A record's `id` comes back as an object:

```ts
{ Table: 'plant_a.products', ID: 'k3j9x...' }   // RecordID
```

**Treat IDs as opaque. Take them from records and pass them back unchanged.**

- ✅ `sdk.collection('products').update(product.id, {...})`: `update`, `delete`, and `getOne` accept the RecordID object or its string form.
- ✅ `categoryId: category.id` sets a relation from another record's `id`.
- ❌ Don't strip IDs to the bare part (`'k3j9x...'`) and don't rebuild them (`` `myapp.products:${id}` ``). The app doesn't know its domain ID, and a wrong table silently matches nothing.
- Need a string (a URL param, a `<select>` value, a Map key)? Use `RecordIDToString(record.id)` → `'plant_a.products:k3j9x...'`, and turn it back with `StringToRecordID(str)`. Both come from `@machhub-dev/sdk-ts`.

The collection *name* you pass to `sdk.collection('products')` is the short name. The server adds the domain prefix.

---

## CRUD

```ts
const sdk = await getSDK(); // see machhub-sdk-initialization

// Create. Returns the stored record, including its generated id
const product = await sdk.collection('products').create({
  name: 'Wireless Mouse',
  price: 29.99,
  categoryId: category.id          // relation: pass the other record's id
});

// Read
const all = await sdk.collection('products').getAll();
const one = await sdk.collection('products').getOne(product.id);

// Update: a partial update, where only the fields you send change
await sdk.collection('products').update(product.id, { price: 34.99 });

// Delete: the relation's onDelete rule (cascade / set null / restrict) applies
await sdk.collection('products').delete(product.id);

// Count and first
const n = await sdk.collection('products').filter('price', '>', 100).count();
const cheapest = await sdk.collection('products').sort('price', 'asc').first(); // null if none
```

- **Custom ID on create:** pass `id: 'SKU-001'` and the server adds the table. Leave it out for a generated ID. A duplicate ID fails with a conflict error.
- **Timestamps:** `created_dt` and `updated_dt` are set by the server.
- **Dates:** send ISO strings (`new Date().toISOString()`).
- **Enums:** send one of the collection's `enumOptions` exactly.
- **Files:** `create` and `update` take `File` objects for file fields. See `machhub-sdk-file-handling`.

---

## Relations

A relation value can be a RecordID object (`other.id`) or its full string (`'plant_a.categories:abc'`). For a **multiple** relation, pass an array of them.

⚠️ **A relation value the server can't parse is dropped silently.** The record still saves, just without that field. That's what happens with a bare `'abc'` or a guessed table name. Always pass IDs taken from real records.

**Expand** replaces relation IDs with the related records:

```ts
const orders = await sdk.collection('orders').getAll({ expand: ['customerId', 'productIds'] });
orders[0].customerId.name;             // the full customer record
const order = await sdk.collection('orders').getOne(id, { expand: 'customerId' });
```

---

## Queries

Every call to `sdk.collection(name)` returns a **new query builder**. Filters stay on that builder, so **start a new one for each query**:

```ts
// ❌ Reusing a builder: the second query still has the 'open' filter
const orders = sdk.collection('orders');
const open = await orders.filter('status', '=', 'open').getAll();
const all  = await orders.getAll();            // still filtered!

// ✅ One builder per query
const open = await sdk.collection('orders').filter('status', '=', 'open').getAll();
const all  = await sdk.collection('orders').getAll();
```

```ts
const rows = await sdk.collection('orders')
  .filter('status', '=', 'open')                   // AND
  .filter('total', '>=', 100)                      // AND
  .orFilter('priority', '=', 'high')               // OR group…
  .orFilter('priority', '=', 'critical')           // …which is ANDed with the filters above
  .sort('created_dt', 'desc')                      // one sort field; a second .sort() replaces it
  .offset(20).limit(10)                            // paging
  .getAll({ fields: ['id', 'status', 'total'] });  // only these fields
```

Things to know:

- `filter(field, op, value)` stores one condition **per field+operator**, so a second `filter('total', '>', …)` replaces the first. For a range, use two operators (`>=` and `<`).
- To filter on a **relation**, pass the ID string: `.filter('customerId', '=', RecordIDToString(customer.id))`.
- To filter on a **date**, pass an ISO string.
- `filter()` only reaches top-level fields.

**Operators:** `=` `!=` `<` `<=` `>` `>=` · `IN` `NOT IN` (value is an array) · `CONTAINS` `CONTAINSNOT` `CONTAINSALL` `CONTAINSANY` `CONTAINSNONE` (for array fields) · `INSIDE` `NOTINSIDE` `ALLINSIDE` `ANYINSIDE` `NONEINSIDE` · `~` `!~` (string contains, fuzzy) · `@@` (full-text, needs a full-text index).

### Inside JSON array fields

For a `json` field holding an array of objects (e.g. `orderLines: [{ itemId, qty }]`), use `filterInArray`. It returns the parent records where **any** element matches:

```ts
const pos = await sdk.collection('purchaseOrders')
  .filterInArray('orderLines', 'itemId', '=', RecordIDToString(item.id))
  .filter('status', '!=', 'cancelled')
  .getAll();

// OR across elements
sdk.collection('purchaseOrders')
  .orFilterInArray('orderLines', 'itemId', '=', a)
  .orFilterInArray('orderLines', 'itemId', '=', b);
```

`filterInArray` operators: `=` `!=` `<` `<=` `>` `>=` `CONTAINS` `IN`. The value is compared with whatever you stored in the JSON, so store IDs in array elements as strings (`RecordIDToString`) and filter with the same string.

---

## Errors

Failed calls throw a `CollectionError` whose message names the operation and collection, plus the HTTP error from the server. Common causes:

| Error | Cause |
|---|---|
| `Collection with name 'x' does not exist` | Wrong short name, or the collection isn't in this domain |
| Conflict / `duplicate record` | The custom `id` already exists |
| 401 / 403 | Not logged in, or the user lacks the `collections` permission |
| A field is missing after save | An unparseable relation value, or an empty string sent to an optional string/json/enum field (the server drops those) |

---

## Service shape

Keep collection access in small per-collection modules instead of scattering `sdk.collection(...)` through components:

```ts
// src/lib/data/orders.ts
import type { RecordID } from '@machhub-dev/sdk-ts';
import { getSDK } from '$lib/machhub/sdk';

export type Order = { id: RecordID; status: 'open' | 'closed'; total: number; customerId: RecordID };

export async function listOpenOrders(): Promise<Order[]> {
  const sdk = await getSDK();
  return sdk.collection('orders').filter('status', '=', 'open').sort('created_dt', 'desc').getAll();
}

export async function closeOrder(order: Order) {
  const sdk = await getSDK();
  await sdk.collection('orders').update(order.id, { status: 'closed' });
}
```

Collection schemas (field types, relations, `onDelete`, indexes) are defined with `machhub-collection-json`.
