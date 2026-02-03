# MACHHUB SDK Authentication Templates

Templates for implementing authentication, authorization, and user management.

## Templates

### 1. `auth.service.ts`
**Complete authentication service**
- Login/logout
- Current user management
- Permission checking
- Group membership
- JWT validation

### 2. `auth.context.ts`
**Authentication state management**
- Framework-agnostic state
- Listener pattern
- Login/logout handling
- Initialization

### 3. `auth.guard.ts`
**Route protection and authorization**
- Permission-based guards
- Group-based guards
- Predefined guard functions
- Flexible authorization rules

### 4. `user-management.service.ts`
**User and group administration**
- Group CRUD operations
- User-group assignments
- Permission management
- Batch operations

## Usage

### Authentication Flow

```typescript
import { authContext } from './contexts/auth.context';

// Initialize on app load
await authContext.initialize();

// Subscribe to changes
authContext.subscribe((state) => {
  console.log('Auth state:', state);
});

// Login
await authContext.login('user@example.com', 'password');

// Check state
const { user, isAuthenticated } = authContext.getState();
```

### Route Guards

```typescript
import { requireAuth, requireAdmin, requirePermission } from './guards/auth.guard';

// Check if user can access route
const canAccess = await requireAuth();

if (!canAccess) {
  // Redirect to login
  window.location.href = '/login';
}

// Check specific permission
const canEdit = await requirePermission('products.edit')();
```

## See Also

- [machhub-sdk-initialization](../machhub-sdk-initialization/) - SDK setup
- [Framework-specific guides](../) - Angular, React, Vue, Svelte implementations
