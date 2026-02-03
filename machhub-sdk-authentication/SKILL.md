---
name: machhub-sdk-authentication
description: Authentication, user management, permissions, and group operations with MACHHUB SDK.
related_skills: [machhub-sdk-initialization, machhub-sdk-architecture]
---

## Overview

This skill covers **authentication and authorization** operations in the MACHHUB SDK, including login/logout, user management, groups, and permissions.

**Use this skill when:**
- Implementing user authentication
- Managing users and groups
- Checking permissions
- Validating JWT tokens
- Creating user management systems

**Prerequisites:**
- SDK initialized using **Designer Extension (zero-config recommended)** - see `machhub-sdk-initialization`
- For production: Manual configuration - see `machhub-sdk-initialization` templates

**Related Skills:**
- `machhub-sdk-initialization` - SDK must be initialized first
- `machhub-sdk-architecture` - Use service pattern for auth operations

---

## Authentication Operations

### Login & Logout

```typescript
import { getOrInitializeSDK } from './sdk.service';

// Login
const sdk = await getOrInitializeSDK();
await sdk.auth.login('username', 'password');

// Logout
await sdk.auth.logout();
```

### Current User

```typescript
// Get current authenticated user
const currentUser = await sdk.auth.getCurrentUser();
console.log(currentUser);
// { id, username, email, firstName, lastName, ... }

// Get JWT data
const jwtData = await sdk.auth.getJWTData();
console.log(jwtData);
// { user_id, username, exp, ... }
```

### JWT Validation

```typescript
// Validate current user's JWT
const { valid } = await sdk.auth.validateCurrentUser();
if (!valid) {
  // Redirect to login page
  window.location.href = '/login';
}

// Validate specific JWT token
await sdk.auth.validateJWT(token);
```

---

## Permission Management

### Check Permission

```typescript
// Check if user has specific permission
const result = await sdk.auth.checkPermission('feature', 'scope', 'read');
if (result.allowed) {
  // User has permission
} else {
  // User doesn't have permission
}

// Available actions: 'create', 'read', 'update', 'delete'
```

### Check Available Actions

```typescript
// Get all allowed actions for a feature/scope
const result = await sdk.auth.checkAction('feature', 'scope');
console.log(result.actions); // ['read', 'update', 'delete']
```

---

## User Management

### Get Users

```typescript
// Get all users
const users = await sdk.auth.getUsers();

// Get user by ID
const user = await sdk.auth.getUserById(userId);
```

### Create User

```typescript
await sdk.auth.createUser(
  'John',           // firstName
  'Doe',            // lastName
  'johndoe',        // username
  'john@example.com', // email
  'password123',    // password
  '1234567890',     // phone number
  null              // user image (optional)
);
```

---

## Group Management

### Get Groups

```typescript
// Get all groups
const groups = await sdk.auth.getGroups();

// Get current user's groups
import { RecordIDToString } from '@machhub-dev/sdk-ts';

const user = await sdk.auth.getCurrentUser();
const groupIds = user.group_ids || [];

const userGroups = groups.filter(group => {
  if (!group.id) return false;
  const groupIdStr = RecordIDToString(group.id);
  return groupIds.includes(groupIdStr);
});
```

### Create Group

```typescript
const newGroup = await sdk.auth.createGroup('GroupName', {
  feature1: ['create', 'read', 'update'],
  feature2: ['read']
});
```

### Add User to Group

```typescript
await sdk.auth.addUserToGroup(userId, groupId);
```

### Add Permissions to Group

```typescript
const permissions = {
  products: ['create', 'read', 'update', 'delete'],
  orders: ['read', 'update'],
  reports: ['read']
};

await sdk.auth.addPermissionsToGroup(groupId, permissions);
```

---

## Auth Service Example

```typescript
// services/auth.service.ts
import { getOrInitializeSDK } from './sdk.service';
import { RecordIDToString } from '@machhub-dev/sdk-ts';
import type { Action } from '@machhub-dev/sdk-ts';

class AuthService {
  async login(username: string, password: string): Promise<boolean> {
    try {
      const sdk = await getOrInitializeSDK();
      await sdk.auth.login(username, password);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      const sdk = await getOrInitializeSDK();
      await sdk.auth.logout();
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      const sdk = await getOrInitializeSDK();
      return await sdk.auth.getCurrentUser();
    } catch (error) {
      console.error('Failed to get current user:', error);
      throw error;
    }
  }

  async validateSession(): Promise<boolean> {
    try {
      const sdk = await getOrInitializeSDK();
      const result = await sdk.auth.validateCurrentUser();
      return result.valid;
    } catch (error) {
      console.error('Session validation failed:', error);
      return false;
    }
  }

  async checkPermission(
    feature: string,
    scope: string,
    action: Action
  ): Promise<boolean> {
    try {
      const sdk = await getOrInitializeSDK();
      const result = await sdk.auth.checkPermission(feature, scope, action);
      return result.allowed || false;
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  async getAvailableActions(
    feature: string,
    scope: string
  ): Promise<Action[]> {
    try {
      const sdk = await getOrInitializeSDK();
      const result = await sdk.auth.checkAction(feature, scope);
      return result.actions || [];
    } catch (error) {
      console.error('Failed to get actions:', error);
      return [];
    }
  }

  async getUserGroups() {
    try {
      const sdk = await getOrInitializeSDK();
      const user = await sdk.auth.getCurrentUser();
      const groupIds = user.group_ids || [];

      if (groupIds.length === 0) {
        return [];
      }

      const groups = await sdk.auth.getGroups();
      return groups.filter(group => {
        if (!group.id) return false;
        const groupIdStr = RecordIDToString(group.id);
        return groupIds.includes(groupIdStr);
      });
    } catch (error) {
      console.error('Error fetching user groups:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
```

---

## Protected Route Pattern

```typescript
// auth-guard.ts or route protection middleware
import { authService } from './services';

let isAuthenticated = false;

// Call this before rendering protected routes
async function checkAuthentication() {
  try {
    const valid = await authService.validateSession();
    
    if (!valid) {
      window.location.href = '/login';
      return false;
    }
    
    isAuthenticated = true;
    
    // Optionally check permissions
    const canAccess = await authService.checkPermission(
      'dashboard',
      'view',
      'read'
    );
    
    if (!canAccess) {
      window.location.href = '/unauthorized';
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Auth check failed:', error);
    window.location.href = '/login';
    return false;
  }
}

// Usage: await checkAuthentication() before loading protected content
```

---

## Error Handling

```typescript
try {
  await sdk.auth.login(username, password);
} catch (error) {
  if (error.message.includes('localStorage')) {
    console.error('Browser environment required for authentication');
  } else if (error.message.includes('credentials')) {
    console.error('Invalid username or password');
  } else {
    console.error('Login failed:', error.message);
  }
}
```

---

## Templates

### Template 1: Auth Service (Complete)

**File:** `src/services/auth.service.ts`

**Purpose:** Complete authentication service with user management

**Code:**

```typescript
// filepath: src/services/auth.service.ts
import { getOrInitializeSDK } from './sdk.service';
import type { SDK } from '@machhub-dev/sdk-ts';

export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  groups?: string[];
  permissions?: string[];
}

export interface LoginCredentials {
  username: string;
  password: string;
}

class AuthService {
  private sdk: SDK | null = null;
  private currentUser: User | null = null;

  private async getSDK(): Promise<SDK> {
    if (!this.sdk) {
      this.sdk = await getOrInitializeSDK();
    }
    return this.sdk;
  }

  /**
   * Login user
   */
  async login(username: string, password: string): Promise<User> {
    try {
      const sdk = await this.getSDK();
      await sdk.auth.login(username, password);
      
      const user = await sdk.auth.getCurrentUser();
      this.currentUser = this.transformUser(user);
      
      return this.currentUser;
    } catch (error) {
      console.error('Login failed:', error);
      throw new Error('Invalid credentials');
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      const sdk = await this.getSDK();
      await sdk.auth.logout();
      this.currentUser = null;
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      if (this.currentUser) {
        return this.currentUser;
      }

      const sdk = await this.getSDK();
      const user = await sdk.auth.getCurrentUser();
      
      if (user) {
        this.currentUser = this.transformUser(user);
        return this.currentUser;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  }

  /**
   * Validate JWT token
   */
  async validateToken(): Promise<boolean> {
    try {
      const sdk = await this.getSDK();
      const jwtData = sdk.auth.getJWTData();
      
      if (!jwtData) {
        return false;
      }

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      return jwtData.exp > now;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get JWT data
   */
  getJWTData(): any {
    try {
      const sdk = this.sdk;
      return sdk?.auth.getJWTData() || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if user has permission
   */
  async hasPermission(permission: string): Promise<boolean> {
    try {
      const sdk = await this.getSDK();
      return await sdk.auth.hasPermission(permission);
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  /**
   * Check if user has any of the permissions
   */
  async hasAnyPermission(permissions: string[]): Promise<boolean> {
    for (const permission of permissions) {
      if (await this.hasPermission(permission)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if user has all permissions
   */
  async hasAllPermissions(permissions: string[]): Promise<boolean> {
    for (const permission of permissions) {
      if (!(await this.hasPermission(permission))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if user belongs to group
   */
  async isInGroup(groupName: string): Promise<boolean> {
    try {
      const sdk = await this.getSDK();
      return await sdk.auth.isInGroup(groupName);
    } catch (error) {
      console.error('Group check failed:', error);
      return false;
    }
  }

  /**
   * Get user's groups
   */
  async getUserGroups(): Promise<string[]> {
    try {
      const user = await this.getCurrentUser();
      return user?.groups || [];
    } catch (error) {
      console.error('Failed to get user groups:', error);
      return [];
    }
  }

  /**
   * Transform user from API format
   */
  private transformUser(raw: any): User {
    return {
      id: raw.id,
      username: raw.username,
      email: raw.email,
      firstName: raw.firstName,
      lastName: raw.lastName,
      groups: raw.groups || [],
      permissions: raw.permissions || []
    };
  }
}

export const authService = new AuthService();
```

---

### Template 2: Auth Context (React/Framework Agnostic)

**File:** `src/contexts/auth.context.ts`

**Purpose:** Authentication state management

**Code:**

```typescript
// filepath: src/contexts/auth.context.ts
import { authService, type User } from '../services/auth.service';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export class AuthContext {
  private state: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: true
  };

  private listeners: Array<(state: AuthState) => void> = [];

  /**
   * Initialize auth context
   */
  async initialize(): Promise<void> {
    this.setState({ isLoading: true });
    
    try {
      const user = await authService.getCurrentUser();
      this.setState({
        user,
        isAuthenticated: user !== null,
        isLoading: false
      });
    } catch (error) {
      console.error('Auth initialization failed:', error);
      this.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });
    }
  }

  /**
   * Login
   */
  async login(username: string, password: string): Promise<void> {
    try {
      const user = await authService.login(username, password);
      this.setState({
        user,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await authService.logout();
      this.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  /**
   * Get current state
   */
  getState(): AuthState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Set state and notify listeners
   */
  private setState(updates: Partial<AuthState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}

export const authContext = new AuthContext();
```

**Usage:**

```typescript
import { authContext } from './contexts/auth.context';

// Initialize on app load
await authContext.initialize();

// Subscribe to changes
const unsubscribe = authContext.subscribe((state) => {
  console.log('Auth state changed:', state);
});

// Login
await authContext.login('user@example.com', 'password');

// Get current state
const { user, isAuthenticated } = authContext.getState();

// Logout
await authContext.logout();

// Cleanup
unsubscribe();
```

---

### Template 3: Route Guard/Middleware

**File:** `src/guards/auth.guard.ts`

**Purpose:** Protect routes that require authentication

**Code:**

```typescript
// filepath: src/guards/auth.guard.ts
import { authService } from '../services/auth.service';

export interface GuardOptions {
  requireAuth?: boolean;
  requiredPermissions?: string[];
  requiredGroups?: string[];
  requireAll?: boolean; // If true, require ALL permissions/groups, else ANY
  redirectTo?: string;
}

export class AuthGuard {
  /**
   * Check if access is allowed
   */
  async canActivate(options: GuardOptions = {}): Promise<boolean> {
    const {
      requireAuth = true,
      requiredPermissions = [],
      requiredGroups = [],
      requireAll = false
    } = options;

    // Check authentication
    if (requireAuth) {
      const isAuthenticated = await authService.isAuthenticated();
      if (!isAuthenticated) {
        return false;
      }
    }

    // Check permissions
    if (requiredPermissions.length > 0) {
      const hasPermission = requireAll
        ? await authService.hasAllPermissions(requiredPermissions)
        : await authService.hasAnyPermission(requiredPermissions);

      if (!hasPermission) {
        return false;
      }
    }

    // Check groups
    if (requiredGroups.length > 0) {
      if (requireAll) {
        for (const group of requiredGroups) {
          if (!(await authService.isInGroup(group))) {
            return false;
          }
        }
      } else {
        let hasGroup = false;
        for (const group of requiredGroups) {
          if (await authService.isInGroup(group)) {
            hasGroup = true;
            break;
          }
        }
        if (!hasGroup) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Create a guard function for a specific route
   */
  static create(options: GuardOptions) {
    const guard = new AuthGuard();
    return async () => guard.canActivate(options);
  }
}

// Predefined guards
export const requireAuth = AuthGuard.create({ requireAuth: true });

export const requireAdmin = AuthGuard.create({
  requireAuth: true,
  requiredGroups: ['admin']
});

export const requirePermission = (permission: string) =>
  AuthGuard.create({
    requireAuth: true,
    requiredPermissions: [permission]
  });
```

**Usage:**

```typescript
import { requireAuth, requireAdmin, requirePermission } from './guards/auth.guard';

// Check if user can access route
const canAccess = await requireAuth();

if (!canAccess) {
  // Redirect to login
  window.location.href = '/login';
}

// Check admin access
const isAdmin = await requireAdmin();

// Check specific permission
const canEdit = await requirePermission('products.edit')();
```

---

### Template 4: User Management Service

**File:** `src/services/user-management.service.ts`

**Purpose:** Service for managing users, groups, and permissions

**Code:**

```typescript
// filepath: src/services/user-management.service.ts
import { getOrInitializeSDK } from './sdk.service';
import type { SDK } from '@machhub-dev/sdk-ts';

export interface Group {
  name: string;
  description?: string;
  permissions: string[];
  users: string[];
}

class UserManagementService {
  private sdk: SDK | null = null;

  private async getSDK(): Promise<SDK> {
    if (!this.sdk) {
      this.sdk = await getOrInitializeSDK();
    }
    return this.sdk;
  }

  // ========== Group Operations ==========

  /**
   * Get all groups
   */
  async getAllGroups(): Promise<Group[]> {
    try {
      const sdk = await this.getSDK();
      return await sdk.auth.getAllGroups();
    } catch (error) {
      console.error('Failed to fetch groups:', error);
      throw error;
    }
  }

  /**
   * Get group by name
   */
  async getGroup(name: string): Promise<Group | null> {
    try {
      const sdk = await this.getSDK();
      return await sdk.auth.getGroup(name);
    } catch (error) {
      console.error(`Failed to fetch group ${name}:`, error);
      return null;
    }
  }

  /**
   * Create group
   */
  async createGroup(group: Group): Promise<Group> {
    try {
      const sdk = await this.getSDK();
      return await sdk.auth.createGroup(group);
    } catch (error) {
      console.error('Failed to create group:', error);
      throw error;
    }
  }

  /**
   * Update group
   */
  async updateGroup(name: string, updates: Partial<Group>): Promise<Group> {
    try {
      const sdk = await this.getSDK();
      return await sdk.auth.updateGroup(name, updates);
    } catch (error) {
      console.error(`Failed to update group ${name}:`, error);
      throw error;
    }
  }

  /**
   * Delete group
   */
  async deleteGroup(name: string): Promise<void> {
    try {
      const sdk = await this.getSDK();
      await sdk.auth.deleteGroup(name);
    } catch (error) {
      console.error(`Failed to delete group ${name}:`, error);
      throw error;
    }
  }

  // ========== User-Group Operations ==========

  /**
   * Add user to group
   */
  async addUserToGroup(username: string, groupName: string): Promise<void> {
    try {
      const sdk = await this.getSDK();
      await sdk.auth.addUserToGroup(username, groupName);
    } catch (error) {
      console.error(`Failed to add user ${username} to group ${groupName}:`, error);
      throw error;
    }
  }

  /**
   * Remove user from group
   */
  async removeUserFromGroup(username: string, groupName: string): Promise<void> {
    try {
      const sdk = await this.getSDK();
      await sdk.auth.removeUserFromGroup(username, groupName);
    } catch (error) {
      console.error(`Failed to remove user ${username} from group ${groupName}:`, error);
      throw error;
    }
  }

  /**
   * Get users in group
   */
  async getUsersInGroup(groupName: string): Promise<string[]> {
    try {
      const group = await this.getGroup(groupName);
      return group?.users || [];
    } catch (error) {
      console.error(`Failed to get users in group ${groupName}:`, error);
      return [];
    }
  }

  // ========== Permission Operations ==========

  /**
   * Grant permission to group
   */
  async grantPermission(groupName: string, permission: string): Promise<void> {
    try {
      const group = await this.getGroup(groupName);
      if (!group) {
        throw new Error(`Group ${groupName} not found`);
      }

      if (!group.permissions.includes(permission)) {
        group.permissions.push(permission);
        await this.updateGroup(groupName, { permissions: group.permissions });
      }
    } catch (error) {
      console.error(`Failed to grant permission ${permission} to group ${groupName}:`, error);
      throw error;
    }
  }

  /**
   * Revoke permission from group
   */
  async revokePermission(groupName: string, permission: string): Promise<void> {
    try {
      const group = await this.getGroup(groupName);
      if (!group) {
        throw new Error(`Group ${groupName} not found`);
      }

      const index = group.permissions.indexOf(permission);
      if (index > -1) {
        group.permissions.splice(index, 1);
        await this.updateGroup(groupName, { permissions: group.permissions });
      }
    } catch (error) {
      console.error(`Failed to revoke permission ${permission} from group ${groupName}:`, error);
      throw error;
    }
  }

  /**
   * Get permissions for group
   */
  async getGroupPermissions(groupName: string): Promise<string[]> {
    try {
      const group = await this.getGroup(groupName);
      return group?.permissions || [];
    } catch (error) {
      console.error(`Failed to get permissions for group ${groupName}:`, error);
      return [];
    }
  }
}

export const userManagementService = new UserManagementService();
```

**Usage:**

```typescript
import { userManagementService } from './services/user-management.service';

// Create group
await userManagementService.createGroup({
  name: 'editors',
  description: 'Content editors',
  permissions: ['content.read', 'content.edit'],
  users: []
});

// Add user to group
await userManagementService.addUserToGroup('john.doe', 'editors');

// Grant permission
await userManagementService.grantPermission('editors', 'content.delete');

// Get all groups
const groups = await userManagementService.getAllGroups();
```

---

## Auth Checklist

- [ ] **Login/logout** implemented
- [ ] **Session validation** checked on app load
- [ ] **Protected routes** have auth guards
- [ ] **Permissions checked** before sensitive operations
- [ ] **Current user** fetched and stored in state
- [ ] **Error handling** for auth failures
- [ ] **Token refresh** handled (if applicable)
- [ ] **Logout cleanup** clears user state

---

## Resources

- **MACHHUB SDK Docs**: https://docs.machhub.dev
- **Initialization Guide**: See `machhub-sdk-initialization`
