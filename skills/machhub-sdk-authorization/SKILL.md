---
name: machhub-sdk-authorization
description: Check what the logged-in MACHHUB user may do (`checkAction`, `checkPermission`), and administer users, groups and permissions through the SDK. Covers features, actions and scopes, how MACHHUB matches them, and which admin operations the SDK has and lacks.
license: MPL-2.0
metadata:
  related_skills: "machhub-sdk-authentication, machhub-permission-json, machhub-groups-json"
---

## The model

A permission is **feature + action + scope**, granted to a **group**. Users belong to groups.

- **Feature**: what is being accessed. It's either a built-in feature (below) or one your app defines (import it with `machhub-permission-json`).
- **Action**: usually `read` or `read-write`, where **`read-write` also grants `read`**. A feature your app defines can also have custom actions (e.g. `approve`), which `checkPermission` matches exactly.
- **Scope**: how far the grant reaches. The ranking is `self` < `user-defined` < `domain` < `all`. A grant at a wider scope satisfies a check at a narrower one. A grant with scope `nil` matches any scope, and `all` also reaches other domains.

Superusers pass every check.

**The server enforces permissions on every request.** Checks in the app only decide what to *show*. Hiding a button is not security, and you don't need to re-implement the server's checks.

---

## Checking the current user

```ts
// Which actions does the user have on a feature at a scope?
const { actions } = await sdk.auth.checkAction('orders', 'domain');
const canView = actions.includes('read') || actions.includes('read-write');
const canEdit = actions.includes('read-write');

// Or ask one yes/no question
const { permission } = await sdk.auth.checkPermission('orders', 'read-write', 'domain');
```

| Call | Returns |
|---|---|
| `checkAction(feature, scope)` | `{ actions: string[] }` |
| `checkPermission(feature, action, scope)` | `{ permission: boolean }` |

There is **no** `hasPermission`, `hasAnyPermission`, or `isInGroup`. Use the two calls above. Fetch once per page (or once at login) and keep the result; don't call them on every render.

---

## Administration

These calls need the caller to hold the matching feature (`users` or `groups`, usually `read-write`). Otherwise the server rejects them.

**Users**

| Call | Notes |
|---|---|
| `getUsers()` | Users in the current domain |
| `getUserById(userId)` | |
| `createUser(firstName, lastName, username, email, password, number, userImage)` | All positional strings. Pass `''` for an empty image |
| `updateUser(userId, { firstName?, lastName?, username?, email?, number?, userImage?, groupIDs? })` | Partial update. **`groupIDs` replaces the user's groups** (`[]` removes all), and omitting it leaves groups alone |
| `deleteUser(userId)` | Soft delete, which also removes memberships |
| `resetPassword(userId)` | Returns `{ password }`, a newly generated one |

**Groups and permissions**

| Call | Notes |
|---|---|
| `getGroups()` | `Group[]`: `{ id, name, features: {name, action, scope, domain}[], user_ids }` |
| `createGroup(name, features)` | `features: { name, action, scope }[]`. The name `Superuser` is reserved |
| `addUserToGroup(userId, groupId)` | Adds one membership |
| `addPermissionsToGroup(groupId, features)` | Appends grants |
| `getPermissions()` | The domain's permission list, as `{ name, action, scope }[]` |

**Not in the SDK:** renaming, updating, or deleting a group; removing a single grant; removing a user from one group. To change a user's memberships, use `updateUser(userId, { groupIDs })` with the full new list. For bulk role setups, use the Permissions page import (`machhub-groups-json`).

IDs: pass the `id` from `getUsers()` or `getGroups()` as a string, using `RecordIDToString(id)` from `@machhub-dev/sdk-ts`. Never build IDs by hand.

---

## Built-in features

`applications`, `users`, `groups`, `api_keys`, `upstreams`, `namespace`, `historian`, `raw_query`, `collections`, `processes`, `flows`, `nodered`, `integration`, `dashboard`, `logs`, `general_settings`, `gateway`, `license`, `backups`, `restores`, `assistant`.

For app-specific rules like "can approve orders", define your own feature (e.g. `orders_approval`) in the Permissions page import, grant it to groups, and check it with `checkAction`.

---

## UI pattern

```ts
// Load once, then use synchronously in the UI
const perms = new Map<string, string[]>();

export async function loadPermissions(features: string[], scope = 'domain') {
  const sdk = await getSDK();
  await Promise.all(features.map(async (f) => {
    try {
      perms.set(f, (await sdk.auth.checkAction(f, scope)).actions ?? []);
    } catch {
      perms.set(f, []);
    }
  }));
}

export const can = (feature: string, action: 'read' | 'read-write') => {
  const a = perms.get(feature) ?? [];
  return a.includes(action) || (action === 'read' && a.includes('read-write'));
};
```

Hide or disable controls with `can(...)`, and still handle a 403 from the server gracefully.
