---
name: machhub-sdk-authorization
description: Authorization, permission checking, group management, and access control with MACHHUB SDK.
related_skills: [machhub-sdk-initialization, machhub-sdk-authentication, machhub-sdk-architecture]
---

## Overview

This skill covers **authorization** operations in the MACHHUB SDK, including permission checking, action resolution, group management, and user administration.

**Use this skill when:**
- Checking whether a user has a specific permission
- Getting all allowed actions for a feature
- Fetching, creating, or managing groups
- Assigning permissions to groups
- Adding users to groups
- Managing users (listing, creating)
- Building access-controlled UI components or routes

**Prerequisites:**
- SDK initialized — see `machhub-sdk-initialization`
- User authenticated — see `machhub-sdk-authentication`

**Key Concepts:**
- **Feature** — a resource or capability (e.g. `"collections"`, `"users"`, `"flows"`)
- **Action** — `"read"`, `"read-write"`, or any custom string
- **Scope** — `"self"` (own data), `"domain"` (domain-wide), `"nil"` (no scope restriction)
- **Group** — a named set of users sharing a set of permissions (FeatureAccess entries)

---

## Permission Checking

### Check a Single Permission

```typescript
// Returns { permission: boolean }
const { permission } = await sdk.auth.checkPermission(
  'collections',   // feature
  'read',          // action: 'read' | 'read-write' | custom
  'domain'         // scope: 'self' | 'domain' | 'nil'
);

if (permission) {
  // User has access
}
```

Signature: `checkPermission(feature: string, action: string, scope: string): Promise<PermissionResponse>`

### Get All Allowed Actions for a Feature

```typescript
// Returns { actions: string[] }
const { actions } = await sdk.auth.checkAction('collections', 'domain');
// e.g. actions = ['read', 'read-write']
```

Signature: `checkAction(feature: string, scope: string): Promise<ActionResponse>`

---

## Group Permissions

### Get Permissions for a Group

```typescript
// Returns Feature[] — the full permission set assigned to the group
const permissions = await sdk.auth.getPermissions(groupId);
// e.g. [{ name: 'collections', action: 'read-write', scope: 'domain' }, ...]
```

Signature: `getPermissions(groupId: string): Promise<Feature[]>`

### Add Permissions to a Group

Each permission entry must have a valid `scope`: `"self"`, `"domain"`, or `"nil"`.

```typescript
import type { Feature } from '@machhub-dev/sdk-ts';

const permissions: Feature[] = [
  { name: 'collections', action: 'read-write', scope: 'domain' },
  { name: 'flows',       action: 'read',       scope: 'domain' },
  { name: 'api_keys',    action: 'read-write', scope: 'self'   },
];

await sdk.auth.addPermissionsToGroup(groupId, permissions);
```

Signature: `addPermissionsToGroup(group_id: string, permissions: Feature[]): Promise<ActionResponse>`

---

## Group Management

### Get All Groups (with users)

```typescript
const groups = await sdk.auth.getGroups();
// Each group: { id, name, features: [{name, action, scope, domain}][], user_ids }
```

### Create a Group

```typescript
import type { Feature } from '@machhub-dev/sdk-ts';

const features: Feature[] = [
  { name: 'collections', action: 'read', scope: 'domain' },
];

const group = await sdk.auth.createGroup('Editors', features);
// Returns: { id, name, ... }
```

Signature: `createGroup(name: string, features: Feature[]): Promise<Group>`

**Notes:**
- Group name `"Superuser"` is reserved and will be rejected.
- Features can also be added later via `addPermissionsToGroup`.

### Add a User to a Group

```typescript
await sdk.auth.addUserToGroup(userId, groupId);
```

Signature: `addUserToGroup(userId: string, groupId: string): Promise<ActionResponse>`

---

## User Management

### Get All Users

```typescript
const users = await sdk.auth.getUsers();
```

### Get User by ID

```typescript
const user = await sdk.auth.getUserById(userId);
```

### Create a User

```typescript
await sdk.auth.createUser(
  'Jane',               // firstName
  'Smith',              // lastName
  'janesmith',          // username
  'jane@example.com',   // email
  'securePassword123',  // password
  '+60123456789',       // phone number
  null                  // userImage (base64 string or null)
);
```

Signature: `createUser(firstName, lastName, username, email, password, number, userImage): Promise<User>`

---

## Getting the Current User's Groups & Permissions

```typescript
import { RecordIDToString } from '@machhub-dev/sdk-ts';

// 1. Get user + their group IDs
const user = await sdk.auth.getCurrentUser();
const groupIds = user.group_ids ?? [];

// 2. Get all domain groups
const allGroups = await sdk.auth.getGroups();

// 3. Filter to the ones this user belongs to
const userGroups = allGroups.filter(group => {
  if (!group.id) return false;
  return groupIds.includes(RecordIDToString(group.id));
});

// 4. Collect all permissions across the user's groups
const allPermissions = userGroups.flatMap(g => g.features ?? []);
```

---

## Authorization Service Pattern

```typescript
// services/authorization.service.ts
import { getOrInitializeSDK } from './sdk.service';
import type { Feature } from '@machhub-dev/sdk-ts';
import { RecordIDToString } from '@machhub-dev/sdk-ts';

class AuthorizationService {
  async canAccess(feature: string, action: string, scope: string): Promise<boolean> {
    try {
      const sdk = await getOrInitializeSDK();
      const { permission } = await sdk.auth.checkPermission(feature, action, scope);
      return permission;
    } catch {
      return false;
    }
  }

  async getAllowedActions(feature: string, scope: string): Promise<string[]> {
    try {
      const sdk = await getOrInitializeSDK();
      const { actions } = await sdk.auth.checkAction(feature, scope);
      return actions ?? [];
    } catch {
      return [];
    }
  }

  async getGroupPermissions(groupId: string): Promise<Feature[]> {
    try {
      const sdk = await getOrInitializeSDK();
      return await sdk.auth.getPermissions(groupId);
    } catch {
      return [];
    }
  }

  async getUserGroups() {
    const sdk = await getOrInitializeSDK();
    const user = await sdk.auth.getCurrentUser();
    const groupIds = user.group_ids ?? [];
    if (groupIds.length === 0) return [];
    const all = await sdk.auth.getGroups();
    return all.filter(g => g.id && groupIds.includes(RecordIDToString(g.id)));
  }
}

export const authorizationService = new AuthorizationService();
```

---

## Permission Guard Pattern

```typescript
// guards/permission.guard.ts
import { authorizationService } from '../services/authorization.service';

export async function requirePermission(
  feature: string,
  action: string,
  scope: string,
  redirectTo = '/unauthorized'
): Promise<boolean> {
  const allowed = await authorizationService.canAccess(feature, action, scope);
  if (!allowed) {
    window.location.href = redirectTo;
    return false;
  }
  return true;
}

// Usage
const canEdit = await requirePermission('collections', 'read-write', 'domain');
```

---

## Templates

### Template 1: Authorization Service

**File:** `src/services/authorization.service.ts`

**Purpose:** Centralized permission and group management service

**Code:**

```typescript
// filepath: src/services/authorization.service.ts
import { getOrInitializeSDK } from './sdk.service';
import type { Feature, Group } from '@machhub-dev/sdk-ts';
import { RecordIDToString } from '@machhub-dev/sdk-ts';

class AuthorizationService {
  /**
   * Check if the current user has a specific permission.
   * @param feature - e.g. 'collections', 'flows', 'users'
   * @param action  - e.g. 'read', 'read-write', or a custom action string
   * @param scope   - 'self' | 'domain' | 'nil'
   */
  async canAccess(feature: string, action: string, scope: string): Promise<boolean> {
    try {
      const sdk = await getOrInitializeSDK();
      const { permission } = await sdk.auth.checkPermission(feature, action, scope);
      return permission;
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  /**
   * Get all actions the current user is allowed for a feature/scope.
   */
  async getAllowedActions(feature: string, scope: string): Promise<string[]> {
    try {
      const sdk = await getOrInitializeSDK();
      const { actions } = await sdk.auth.checkAction(feature, scope);
      return actions ?? [];
    } catch (error) {
      console.error('Failed to get allowed actions:', error);
      return [];
    }
  }

  /** Fetch all domain groups (includes their features/permissions). */
  async getGroups(): Promise<Group[]> {
    const sdk = await getOrInitializeSDK();
    return sdk.auth.getGroups();
  }

  /** Fetch the permissions assigned to a specific group. */
  async getGroupPermissions(groupId: string): Promise<Feature[]> {
    try {
      const sdk = await getOrInitializeSDK();
      return await sdk.auth.getPermissions(groupId);
    } catch (error) {
      console.error('Failed to get group permissions:', error);
      return [];
    }
  }

  /** Create a new group with optional initial permissions. */
  async createGroup(name: string, features: Feature[] = []): Promise<Group> {
    const sdk = await getOrInitializeSDK();
    return sdk.auth.createGroup(name, features);
  }

  /** Assign a user to a group. */
  async addUserToGroup(userId: string, groupId: string): Promise<void> {
    const sdk = await getOrInitializeSDK();
    await sdk.auth.addUserToGroup(userId, groupId);
  }

  /**
   * Add permissions to an existing group.
   * Valid scopes: 'self' | 'domain' | 'nil'
   */
  async addPermissionsToGroup(groupId: string, permissions: Feature[]): Promise<void> {
    const sdk = await getOrInitializeSDK();
    await sdk.auth.addPermissionsToGroup(groupId, permissions);
  }

  /** Get all groups the current user belongs to. */
  async getCurrentUserGroups(): Promise<Group[]> {
    const sdk = await getOrInitializeSDK();
    const user = await sdk.auth.getCurrentUser();
    const groupIds = user.group_ids ?? [];
    if (groupIds.length === 0) return [];
    const all = await sdk.auth.getGroups();
    return all.filter(g => g.id && groupIds.includes(RecordIDToString(g.id)));
  }
}

export const authorizationService = new AuthorizationService();
```

---

### Template 2: Permission Guard

**File:** `src/guards/permission.guard.ts`

**Purpose:** Protect routes and UI blocks based on permissions

**Code:**

```typescript
// filepath: src/guards/permission.guard.ts
import { authorizationService } from '../services/authorization.service';

export interface PermissionGuardOptions {
  feature: string;
  action: string;
  scope: string;
  redirectTo?: string;
}

/**
 * Returns true if the user has the required permission.
 * Optionally redirects if not allowed.
 */
export async function requirePermission(options: PermissionGuardOptions): Promise<boolean> {
  const { feature, action, scope, redirectTo } = options;

  const allowed = await authorizationService.canAccess(feature, action, scope);

  if (!allowed && redirectTo) {
    window.location.href = redirectTo;
  }

  return allowed;
}

/**
 * Gate a block of code behind a permission check.
 * Returns the result of `fn` if allowed, or `fallback` if not.
 */
export async function withPermission<T>(
  options: PermissionGuardOptions,
  fn: () => Promise<T> | T,
  fallback?: T
): Promise<T | undefined> {
  const allowed = await authorizationService.canAccess(
    options.feature,
    options.action,
    options.scope
  );
  if (!allowed) return fallback;
  return fn();
}
```

**Usage:**

```typescript
import { requirePermission, withPermission } from './guards/permission.guard';

// Redirect if not allowed
await requirePermission({
  feature: 'collections',
  action: 'read-write',
  scope: 'domain',
  redirectTo: '/unauthorized'
});

// Gate a data fetch
const data = await withPermission(
  { feature: 'flows', action: 'read', scope: 'domain' },
  () => sdk.flow.getFlows(),
  []
);
```

---

### Template 3: Group Management Service

**File:** `src/services/group-management.service.ts`

**Purpose:** Admin service for creating and managing groups with permissions

**Code:**

```typescript
// filepath: src/services/group-management.service.ts
import { getOrInitializeSDK } from './sdk.service';
import type { Feature, Group } from '@machhub-dev/sdk-ts';

class GroupManagementService {
  /**
   * Create a new group.
   * @param name     - Display name (cannot be "Superuser")
   * @param features - Initial permissions (can be empty, add later via addPermissions)
   */
  async createGroup(name: string, features: Feature[] = []): Promise<Group> {
    const sdk = await getOrInitializeSDK();
    return sdk.auth.createGroup(name, features);
  }

  /** Fetch all groups in the current domain (includes user_ids and features). */
  async getGroups(): Promise<Group[]> {
    const sdk = await getOrInitializeSDK();
    return sdk.auth.getGroups();
  }

  /**
   * Get the current permission set of a group.
   * Returns Feature[] — each entry has { name, action, scope }.
   */
  async getGroupPermissions(groupId: string): Promise<Feature[]> {
    const sdk = await getOrInitializeSDK();
    return sdk.auth.getPermissions(groupId);
  }

  /**
   * Append permissions to a group.
   * Valid scopes: 'self' | 'domain' | 'nil'
   *
   * @example
   * await groupService.addPermissions(groupId, [
   *   { name: 'collections', action: 'read-write', scope: 'domain' },
   *   { name: 'api_keys',    action: 'read-write', scope: 'self'   },
   * ]);
   */
  async addPermissions(groupId: string, permissions: Feature[]): Promise<void> {
    const sdk = await getOrInitializeSDK();
    await sdk.auth.addPermissionsToGroup(groupId, permissions);
  }

  /** Assign a user to a group. */
  async addUser(userId: string, groupId: string): Promise<void> {
    const sdk = await getOrInitializeSDK();
    await sdk.auth.addUserToGroup(userId, groupId);
  }
}

export const groupManagementService = new GroupManagementService();
```

---

## MACHHUB Built-in Feature Names

Use these values for the `name` field in `Feature`:

| Feature name             | Description                          |
|--------------------------|--------------------------------------|
| `applications`           | Manage applications                  |
| `users`                  | Manage user accounts                 |
| `groups`                 | Manage groups and permissions        |
| `api_keys`               | Manage API keys                      |
| `upstreams`              | Manage upstream connections          |
| `collections`            | Manage data collections              |
| `flows`                  | Node-RED flow management             |
| `historian`              | Time-series historian data           |
| `processes`              | Manage processes                     |
| `general_settings`       | General system settings              |
| `gateway`                | Gateway configuration                |
| `logs`                   | Access system logs                   |
| `dashboard`              | Dashboard access                     |
| `integration`            | Integration management               |
| `manage_namespace`       | Manage namespaces                    |
| `license`                | License management                   |

You can also use custom feature names for your application-specific permissions.

---

## Authorization Checklist

- [ ] `checkPermission` called before sensitive mutations
- [ ] `checkAction` used to show/hide UI controls dynamically
- [ ] `getPermissions` used when displaying a group's permission set
- [ ] `addPermissionsToGroup` uses valid scopes: `self`, `domain`, or `nil`
- [ ] `createGroup` avoids the reserved name `"Superuser"`
- [ ] User management operations gated behind appropriate permissions
- [ ] Permission checks on route entry, not just on data fetch

---

## Related Skills

- `machhub-sdk-authentication` — Login, logout, JWT, current user
- `machhub-sdk-initialization` — SDK setup (required first)
- `machhub-sdk-architecture` — Service pattern for organizing SDK calls
