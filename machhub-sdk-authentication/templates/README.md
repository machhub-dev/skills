# MACHHUB SDK Authentication Templates

Templates for implementing authentication and session management.

## Templates

### 1. `auth.service.ts`
**Authentication service**
- Login/logout
- Current user management
- JWT validation
- Session checking

### 2. `auth.context.ts`
**Authentication state management**
- Framework-agnostic state
- Listener pattern
- Login/logout handling
- Initialization

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

## See Also

- [machhub-sdk-authorization](../machhub-sdk-authorization/) - Permissions, groups, and access control
- [machhub-sdk-initialization](../machhub-sdk-initialization/) - SDK setup
- [Framework-specific guides](../) - Angular, React, Vue, Svelte implementations
