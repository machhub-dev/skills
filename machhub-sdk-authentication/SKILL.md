---
name: machhub-sdk-authentication
description: Authentication operations with MACHHUB SDK — login, logout, current user, and JWT validation.
related_skills: [machhub-sdk-initialization, machhub-sdk-architecture, machhub-sdk-authorization]
---

## Overview

This skill covers **authentication** operations in the MACHHUB SDK, including login/logout, current user retrieval, and JWT validation.

**Use this skill when:**
- Implementing user login and logout
- Validating or inspecting JWT tokens
- Retrieving the currently authenticated user
- Checking session validity

**For permissions, groups, and access control, see `machhub-sdk-authorization`.**

**Prerequisites:**
- SDK initialized using **Designer Extension (zero-config recommended)** - see `machhub-sdk-initialization`
- For production: Manual configuration - see `machhub-sdk-initialization` templates

**Related Skills:**
- `machhub-sdk-initialization` - SDK must be initialized first
- `machhub-sdk-authorization` - Permissions, groups, and access control
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

## Auth Service Example

```typescript
// services/auth.service.ts
import { getOrInitializeSDK } from './sdk.service';

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
}

export const authService = new AuthService();
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

### Template 1: Auth Service

**File:** `src/services/auth.service.ts`

**Purpose:** Authentication service — login, logout, current user, session validation

**Code:**

```typescript
// filepath: src/services/auth.service.ts
import { getOrInitializeSDK } from './sdk.service';
import type { SDK } from '@machhub-dev/sdk-ts';

export interface LoginCredentials {
  username: string;
  password: string;
}

class AuthService {
  private sdk: SDK | null = null;
  private currentUser: any = null;

  private async getSDK(): Promise<SDK> {
    if (!this.sdk) {
      this.sdk = await getOrInitializeSDK();
    }
    return this.sdk;
  }

  /** Login user — stores JWT in localStorage (or in-memory for Node.js) */
  async login(username: string, password: string): Promise<void> {
    const sdk = await this.getSDK();
    await sdk.auth.login(username, password);
    this.currentUser = await sdk.auth.getCurrentUser();
  }

  /** Logout user — clears stored JWT */
  async logout(): Promise<void> {
    const sdk = await this.getSDK();
    await sdk.auth.logout();
    this.currentUser = null;
  }

  /** Get current authenticated user */
  async getCurrentUser() {
    if (this.currentUser) return this.currentUser;
    const sdk = await this.getSDK();
    this.currentUser = await sdk.auth.getCurrentUser();
    return this.currentUser;
  }

  /** Validate current session. Returns false if JWT is expired or missing. */
  async validateSession(): Promise<boolean> {
    try {
      const sdk = await this.getSDK();
      const { valid } = await sdk.auth.validateCurrentUser();
      return valid;
    } catch {
      return false;
    }
  }

  /** Get decoded JWT payload */
  async getJWTData(): Promise<any> {
    const sdk = await this.getSDK();
    return sdk.auth.getJWTData();
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

## Auth Checklist

- [ ] **Login/logout** implemented
- [ ] **Session validation** checked on app load
- [ ] **Current user** fetched and stored in state
- [ ] **Error handling** for auth failures
- [ ] **Token refresh** handled (if applicable)
- [ ] **Logout cleanup** clears user state

---

## Resources

- **MACHHUB SDK Docs**: https://docs.machhub.dev
- **Initialization Guide**: See `machhub-sdk-initialization`
- **Permission & Group Management**: See `machhub-sdk-authorization`

