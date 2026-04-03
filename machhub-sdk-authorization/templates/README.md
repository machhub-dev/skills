# MACHHUB SDK Authorization Templates

Templates for implementing permission checks, group management, and access control.

## Templates

### 1. `authorization.service.ts`
**Centralized authorization service**
- Permission checking (`canAccess`)
- Allowed action resolution
- Group CRUD (create, fetch)
- Permission assignment to groups
- User-to-group assignment
- Current user's group lookup

### 2. `permission.guard.ts`
**Route and UI permission gating**
- `requirePermission` — blocks/redirects on missing permission
- `withPermission` — wraps async calls behind a permission check

### 3. `group-management.service.ts`
**Group and permission administration**
- Create groups
- Fetch all domain permissions (`getPermissions`)
- Add permissions to groups
- Add users to groups

## Usage

### Check permission before a mutation

```typescript
import { authorizationService } from './services/authorization.service';

const canEdit = await authorizationService.canAccess('collections', 'read-write', 'domain');
if (!canEdit) throw new Error('Unauthorized');
```

### Guard a route

```typescript
import { requirePermission } from './guards/permission.guard';

await requirePermission({
  feature: 'flows',
  action: 'read',
  scope: 'domain',
  redirectTo: '/unauthorized'
});
```

### Manage a group's permissions

```typescript
import { groupManagementService } from './services/group-management.service';

// Create group
const group = await groupManagementService.createGroup('Operators', [
  { name: 'flows', action: 'read', scope: 'domain' }
]);

// View current permissions
const perms = await groupManagementService.getGroupPermissions(group.id);

// Add more
await groupManagementService.addPermissions(group.id, [
  { name: 'historian', action: 'read', scope: 'domain' }
]);
```

## See Also

- [machhub-sdk-authentication](../machhub-sdk-authentication/) — Login, logout, JWT, current user
- [machhub-sdk-initialization](../machhub-sdk-initialization/) — SDK setup
