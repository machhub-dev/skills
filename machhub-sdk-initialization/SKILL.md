---
name: machhub-sdk-initialization
description: Initialize and configure the MACHHUB SDK using Designer Extension (preferred for VSCode) or manual configuration. Covers singleton pattern setup and connection management.
related_skills: [machhub-sdk-architecture, machhub-sdk-collections, machhub-sdk-authentication, machhub-sdk-realtime]
---

## Overview

This skill covers **SDK initialization and configuration** for the MACHHUB TypeScript SDK. It teaches agents how to properly set up and initialize the SDK using the correct method for each environment.

**Use this skill when:**
- Setting up MACHHUB SDK for the first time
- Initializing SDK in VSCode development environment
- Configuring SDK for production deployments
- Setting up SDK in SPA (Single Page Applications)
- Setting up SDK in SSR/server-side applications
- Troubleshooting SDK connection issues

**Prerequisites:**
- Package installed: `npm install @machhub-dev/sdk-ts`

**Related Skills:**
- `machhub-sdk-architecture` - Service patterns and BaseService implementation
- `machhub-sdk-collections` - Using the initialized SDK for CRUD operations
- `machhub-sdk-authentication` - Auth operations requiring initialized SDK

---

## Package Information

- **Package Name**: `@machhub-dev/sdk-ts`
- **Purpose**: Official TypeScript/JavaScript SDK for interfacing with MACHHUB API
- **Installation**: `npm install @machhub-dev/sdk-ts`
- **Documentation**: https://docs.machhub.dev

---

## SDK Initialization Methods

**CRITICAL: Choose the right initialization method for your environment.**

The MACHHUB SDK supports **two initialization methods**:

1. **🎯 MACHHUB Designer Extension (RECOMMENDED for VSCode)** - Zero-configuration
2. **⚙️ Manual Configuration** - Explicit connection parameters

---

## Method 1: MACHHUB Designer Extension (PREFERRED) ⭐

### When to Use

- ✅ Developing in VSCode with MACHHUB Designer Extension installed
- ✅ Local development and testing
- ✅ VSCode extension development
- ✅ Rapid prototyping
- ✅ Desktop applications (Electron)
- ✅ SPA development (when deployed to MACHHUB runtime)

### Prerequisites

- MACHHUB Designer Extension installed in VS Code
- Extension configured and running in workspace

### Advantages

- **Zero configuration** - No connection parameters needed
- **Automatic connection** - Extension handles all connection details
- **Simplified workflow** - No hardcoded credentials
- **Hot reload** - Changes to extension config auto-update

### Implementation

```typescript
// services/sdk.service.ts
import { SDK } from '@machhub-dev/sdk-ts';

/**
 * Singleton SDK Service using MACHHUB Designer Extension
 * No configuration parameters needed - extension handles all connection details
 */
class SDKService {
  private static instance: SDKService | null = null;
  private sdk: SDK | null = null;
  private isInitialized = false;
  private initPromise: Promise<boolean> | null = null;

  private constructor() {
    this.sdk = new SDK();
  }

  public static getInstance(): SDKService {
    if (!SDKService.instance) {
      SDKService.instance = new SDKService();
    }
    return SDKService.instance;
  }

  /**
   * Initialize SDK using MACHHUB Designer Extension settings
   * No parameters needed - extension provides all configuration
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        if (!this.sdk) {
          this.sdk = new SDK();
        }

        // Initialize without parameters - uses MACHHUB Designer Extension
        const success = await this.sdk.Initialize();
        this.isInitialized = success;

        if (success) {
          console.log('SDK initialized successfully using MACHHUB Designer Extension!');
        } else {
          console.error('SDK initialization failed. Ensure MACHHUB Designer Extension is installed and configured.');
        }

        return success;
      } catch (error) {
        console.error('Error initializing SDK:', error);
        this.isInitialized = false;
        return false;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  public getSDK(): SDK {
    if (!this.isInitialized || !this.sdk) {
      throw new Error('SDK not initialized. Call initialize() first.');
    }
    return this.sdk;
  }

  public async getOrInitializeSDK(): Promise<SDK> {
    if (!this.isInitialized) {
      const success = await this.initialize();
      if (!success) {
        throw new Error('Failed to initialize SDK');
      }
    }
    return this.getSDK();
  }

  public get initialized(): boolean {
    return this.isInitialized;
  }

  public reset(): void {
    this.sdk = null;
    this.isInitialized = false;
    this.initPromise = null;
  }
}

export const sdkService = SDKService.getInstance();

export async function getOrInitializeSDK(): Promise<SDK> {
  return sdkService.getOrInitializeSDK();
}
```

### Usage in Application

```typescript
// In your root component or main file
import { getOrInitializeSDK } from './services/sdk.service';

async function main() {
  try {
    // Just call without any configuration
    const sdk = await getOrInitializeSDK();
    console.log('SDK ready!');
    
    // Use SDK
    const items = await sdk.collection('items').getAll();
  } catch (error) {
    console.error('Failed to initialize SDK:', error);
  }
}

main();
```

### Usage in VSCode Extension

```typescript
// extension.ts
import * as vscode from 'vscode';
import { getOrInitializeSDK } from './services/sdk.service';

export async function activate(context: vscode.ExtensionContext) {
  try {
    // Initialize SDK on extension activation
    const sdk = await getOrInitializeSDK();
    console.log('Machhub SDK initialized in VSCode extension');
    
    // Register commands
    let disposable = vscode.commands.registerCommand('extension.getData', async () => {
      const items = await sdk.collection('items').getAll();
      vscode.window.showInformationMessage(`Found ${items.length} items`);
    });
    
    context.subscriptions.push(disposable);
  } catch (error) {
    console.error('Failed to initialize Machhub SDK:', error);
    vscode.window.showErrorMessage('Machhub SDK initialization failed');
  }
}

export function deactivate() {
  // Cleanup if needed
}
```

---

## Method 2: Manual Configuration

### When to Use

- ✅ Production deployments (SPA & SSR)
- ✅ CI/CD pipelines
- ✅ Environments without MACHHUB Designer Extension
- ✅ SPA applications (React, Vue, Angular, etc.)
- ✅ SSR applications (Next.js, Nuxt, SvelteKit, etc.)
- ✅ Custom connection requirements
- ✅ Multiple environment configurations

### SDKConfig Interface

```typescript
interface SDKConfig {
  application_id: string;    // Required - Your application identifier
  developer_key?: string;    // Optional - Developer authentication key
  httpUrl?: string;          // Optional - HTTP API endpoint
  mqttUrl?: string;          // Optional - MQTT broker for real-time
  natsUrl?: string;          // Optional - NATS messaging server
}
```

### Implementation (Browser Environment)

```typescript
// services/sdk.service.ts
import { SDK, type SDKConfig } from '@machhub-dev/sdk-ts';

/**
 * Singleton SDK Service with manual configuration
 * For browser environments (SPA and SSR client-side)
 */
class SDKService {
  private static instance: SDKService | null = null;
  private sdk: SDK | null = null;
  private isInitialized = false;
  private initPromise: Promise<boolean> | null = null;

  private constructor() {
    this.sdk = new SDK();
  }

  public static getInstance(): SDKService {
    if (!SDKService.instance) {
      SDKService.instance = new SDKService();
    }
    return SDKService.instance;
  }

  /**
   * Initialize SDK with manual configuration
   * @param config - SDK configuration options
   */
  public async initialize(config?: SDKConfig): Promise<boolean> {
    // Check browser environment (required for SDK)
    // SPA: Always runs in browser
    // SSR: Skip during server-side rendering, run on client
    if (typeof window === 'undefined') {
      console.warn('SDK requires browser environment');
      return false;
    }

    if (this.isInitialized) {
      return true;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        if (!this.sdk) {
          this.sdk = new SDK();
        }

        const success = await this.sdk.Initialize(config);
        this.isInitialized = success;

        if (success) {
          console.log('MACHHUB SDK initialized successfully');
        } else {
          console.error('MACHHUB SDK initialization failed');
        }

        return success;
      } catch (error) {
        console.error('Error initializing MACHHUB SDK:', error);
        this.isInitialized = false;
        return false;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  public getSDK(): SDK {
    if (!this.isInitialized || !this.sdk) {
      throw new Error('SDK not initialized. Call initialize() first.');
    }
    return this.sdk;
  }

  public async getOrInitializeSDK(config?: SDKConfig): Promise<SDK> {
    if (!this.isInitialized) {
      const success = await this.initialize(config);
      if (!success) {
        throw new Error('Failed to initialize SDK');
      }
    }
    return this.getSDK();
  }

  public get initialized(): boolean {
    return this.isInitialized;
  }

  public reset(): void {
    this.sdk = null;
    this.isInitialized = false;
    this.initPromise = null;
  }
}

export const sdkService = SDKService.getInstance();

/**
 * Helper function with default configuration
 */
export async function getOrInitializeSDK(config?: SDKConfig): Promise<SDK> {
  return sdkService.getOrInitializeSDK({ 
    application_id: 'your-app-name',
    ...config 
  });
}
```

### Configuration Examples

**Development:**
```typescript
const sdk = await getOrInitializeSDK({
  application_id: 'my-app',
  httpUrl: 'http://localhost:80',
  mqttUrl: 'mqtt://localhost:1883',
  natsUrl: 'nats://localhost:4222'
});
```

**Production:**
```typescript
const sdk = await getOrInitializeSDK({
  application_id: process.env.MACHHUB_APP_ID!,
  developer_key: process.env.MACHHUB_DEVELOPER_KEY,
  httpUrl: process.env.MACHHUB_HTTP_URL,
  mqttUrl: process.env.MACHHUB_MQTT_URL,
  natsUrl: process.env.MACHHUB_NATS_URL
});
```

### Environment Variables

```bash
# .env
MACHHUB_APP_ID=your-app-name
MACHHUB_DEVELOPER_KEY=your-developer-key
MACHHUB_HTTP_URL=http://localhost:80
MACHHUB_MQTT_URL=mqtt://localhost:1883
MACHHUB_NATS_URL=nats://localhost:4222
```

### Usage in Application

```typescript
// app.ts or main entry point
import { getOrInitializeSDK } from './services/sdk.service';

let isInitialized = false;

async function initializeApp() {
  try {
    const sdk = await getOrInitializeSDK();
    isInitialized = true;
    console.log('SDK initialized successfully');
  } catch (error) {
    console.error('SDK initialization failed:', error);
  }
}

// Call on app startup
initializeApp();
```

---

## SPA Deployment Notes

**MACHHUB App Runtime supports deploying SPAs directly.**

### SPA Deployment Characteristics

- ✅ **Pure client-side** - All code runs in browser
- ✅ **No SSR concerns** - No server-side rendering to handle
- ✅ **Direct SDK usage** - No browser environment checks needed
- ✅ **Simpler configuration** - No hybrid client/server setup

### SPA Initialization Pattern

```typescript
// SPA apps can initialize directly without browser checks
import { getOrInitializeSDK } from './services/sdk.service';

// React example
function App() {
  useEffect(() => {
    async function init() {
      const sdk = await getOrInitializeSDK({
        application_id: import.meta.env.VITE_MACHHUB_APP_ID,
        httpUrl: import.meta.env.VITE_MACHHUB_HTTP_URL
      });
      console.log('SDK ready');
    }
    init();
  }, []);
  
  return <div>My App</div>;
}

// Vue example
export default {
  async mounted() {
    const sdk = await getOrInitializeSDK({
      application_id: import.meta.env.VITE_MACHHUB_APP_ID,
      httpUrl: import.meta.env.VITE_MACHHUB_HTTP_URL
    });
    console.log('SDK ready');
  }
}

// Angular example
export class AppComponent implements OnInit {
  async ngOnInit() {
    const sdk = await getOrInitializeSDK({
      application_id: environment.machhubAppId,
      httpUrl: environment.machhubHttpUrl
    });
    console.log('SDK ready');
  }
}
```

### SPA vs SSR Configuration

| Aspect              | SPA               | SSR                      |
| ------------------- | ----------------- | ------------------------ |
| **Browser Check**   | ❌ Not needed      | ✅ Required               |
| **Initialization**  | On app mount      | On client-side hydration |
| **Environment**     | Always browser    | Server + Browser         |
| **Complexity**      | 🟢 Simple          | 🟡 Moderate               |
| **MACHHUB Runtime** | ✅ Fully supported | ✅ Fully supported        |

---

## Choosing the Right Method

### Decision Matrix

| Factor                    | Designer Extension     | Manual Config      |
| ------------------------- | ---------------------- | ------------------ |
| **Development in VSCode** | ✅ Perfect              | ⚠️ More setup       |
| **Production Deploy**     | ❌ Not available        | ✅ Required         |
| **SPA Applications**      | ✅ Dev only             | ✅ Full support     |
| **SSR Applications**      | ❌ Limited              | ✅ Full support     |
| **CI/CD Pipeline**        | ❌ Not suitable         | ✅ Ideal            |
| **Configuration Needed**  | 🟢 Zero config          | 🟡 Environment vars |
| **Credential Management** | 🟢 Handled by extension | 🟡 Must secure      |

### Quick Decision Guide

```typescript
// 🎯 Are you developing in VSCode with MACHHUB Designer Extension?
//    → Use Method 1 (Designer Extension)
const sdk = await getOrInitializeSDK(); // No config!

// ⚙️ Are you deploying to production (SPA or SSR)?
//    → Use Method 2 (Manual Configuration)
const sdk = await getOrInitializeSDK({
  application_id: process.env.MACHHUB_APP_ID!,
  httpUrl: process.env.MACHHUB_HTTP_URL
});
```

---

## Singleton Pattern (CRITICAL)

**The SDK MUST be initialized ONCE and reused throughout the application.**

### Why Singleton?

- ✅ Single connection pool
- ✅ Consistent state management
- ✅ Better performance (avoid reconnections)
- ✅ Proper cleanup and lifecycle management

### Anti-Patterns to Avoid

```typescript
// ❌ WRONG - Creating multiple instances
async function getData() {
  const sdk = new SDK();
  await sdk.Initialize();
  return sdk.collection('items').getAll();
}

// ❌ WRONG - Initializing in every function
async function createItem(data) {
  const sdk = new SDK();
  await sdk.Initialize({ application_id: 'app' });
  return sdk.collection('items').create(data);
}

// ✅ CORRECT - Use singleton service
async function getData() {
  const sdk = await getOrInitializeSDK();
  return sdk.collection('items').getAll();
}
```

---

## Error Handling

### Initialization Errors

```typescript
try {
  const sdk = await getOrInitializeSDK();
  console.log('SDK ready');
} catch (error) {
  if (error.message.includes('not initialized')) {
    console.error('SDK initialization failed. Check configuration.');
  } else if (error.message.includes('Designer Extension')) {
    console.error('MACHHUB Designer Extension not found. Install or use manual config.');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Connection Errors

```typescript
const success = await sdkService.initialize(config);

if (!success) {
  console.error('Failed to connect to MACHHUB. Check:');
  console.error('1. Network connectivity');
  console.error('2. API endpoint URL is correct');
  console.error('3. Application ID is valid');
  console.error('4. MACHHUB Designer Extension is running (if using Method 1)');
}
```

---

## Testing Initialization

```typescript
// Test SDK initialization
describe('SDK Initialization', () => {
  afterEach(() => {
    sdkService.reset();
  });

  test('should initialize successfully with Designer Extension', async () => {
    const success = await sdkService.initialize();
    expect(success).toBe(true);
    expect(sdkService.initialized).toBe(true);
  });

  test('should initialize with manual config', async () => {
    const success = await sdkService.initialize({
      application_id: 'test-app',
      httpUrl: 'http://localhost:80'
    });
    expect(success).toBe(true);
  });

  test('should return same instance on multiple calls', async () => {
    const sdk1 = await getOrInitializeSDK();
    const sdk2 = await getOrInitializeSDK();
    expect(sdk1).toBe(sdk2);
  });
});
```

---

## Templates

### Template 1: SDK Service (Designer Extension)

**File:** `src/services/sdk.service.ts` or `lib/sdk.service.ts`

**Purpose:** Complete SDK service using MACHHUB Designer Extension (zero-config)

**When to use:**
- Local development in VSCode
- MACHHUB Designer Extension is installed
- Rapid prototyping

**Code:**

```typescript
// filepath: src/services/sdk.service.ts
import { SDK } from '@machhub-dev/sdk-ts';

class SDKService {
  private static instance: SDKService | null = null;
  private sdk: SDK | null = null;
  private isInitialized = false;
  private initPromise: Promise<boolean> | null = null;

  private constructor() {
    this.sdk = new SDK();
  }

  public static getInstance(): SDKService {
    if (!SDKService.instance) {
      SDKService.instance = new SDKService();
    }
    return SDKService.instance;
  }

  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        if (!this.sdk) {
          this.sdk = new SDK();
        }

        const success = await this.sdk.Initialize();
        this.isInitialized = success;

        if (success) {
          console.log('SDK initialized successfully!');
        } else {
          console.error('SDK initialization failed');
        }

        return success;
      } catch (error) {
        console.error('Error initializing SDK:', error);
        this.isInitialized = false;
        return false;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  public getSDK(): SDK {
    if (!this.isInitialized || !this.sdk) {
      throw new Error('SDK not initialized. Call initialize() first.');
    }
    return this.sdk;
  }

  public async getOrInitializeSDK(): Promise<SDK> {
    if (!this.isInitialized) {
      const success = await this.initialize();
      if (!success) {
        throw new Error('Failed to initialize SDK');
      }
    }
    return this.getSDK();
  }

  public get initialized(): boolean {
    return this.isInitialized;
  }

  public reset(): void {
    this.sdk = null;
    this.isInitialized = false;
    this.initPromise = null;
  }
}

export const sdkService = SDKService.getInstance();

export async function getOrInitializeSDK(): Promise<SDK> {
  return sdkService.getOrInitializeSDK();
}
```

**Usage:**

```typescript
import { getOrInitializeSDK } from './services/sdk.service';

async function main() {
  const sdk = await getOrInitializeSDK();
  // Use SDK
  const items = await sdk.collection('items').getAll();
}
```

---

### Template 2: SDK Service (Manual Configuration)

**File:** `src/services/sdk.service.ts` or `lib/sdk.service.ts`

**Purpose:** Complete SDK service with manual configuration for production/SSR

**When to use:**
- Production deployments
- SPA applications
- SSR applications
- CI/CD pipelines

**Code:**

```typescript
// filepath: src/services/sdk.service.ts
import { SDK, type SDKConfig } from '@machhub-dev/sdk-ts';

class SDKService {
  private static instance: SDKService | null = null;
  private sdk: SDK | null = null;
  private isInitialized = false;
  private initPromise: Promise<boolean> | null = null;

  private constructor() {
    this.sdk = new SDK();
  }

  public static getInstance(): SDKService {
    if (!SDKService.instance) {
      SDKService.instance = new SDKService();
    }
    return SDKService.instance;
  }

  public async initialize(config?: SDKConfig): Promise<boolean> {
    // Check browser environment (required for SDK)
    // SPA: Always runs in browser
    // SSR: Skip during server-side rendering, run on client
    if (typeof window === 'undefined') {
      console.warn('SDK requires browser environment');
      return false;
    }

    if (this.isInitialized) {
      return true;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        if (!this.sdk) {
          this.sdk = new SDK();
        }

        const success = await this.sdk.Initialize(config);
        this.isInitialized = success;

        if (success) {
          console.log('MACHHUB SDK initialized successfully');
        } else {
          console.error('MACHHUB SDK initialization failed');
        }

        return success;
      } catch (error) {
        console.error('Error initializing MACHHUB SDK:', error);
        this.isInitialized = false;
        return false;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  public getSDK(): SDK {
    if (!this.isInitialized || !this.sdk) {
      throw new Error('SDK not initialized. Call initialize() first.');
    }
    return this.sdk;
  }

  public async getOrInitializeSDK(config?: SDKConfig): Promise<SDK> {
    if (!this.isInitialized) {
      const success = await this.initialize(config);
      if (!success) {
        throw new Error('Failed to initialize SDK');
      }
    }
    return this.getSDK();
  }

  public get initialized(): boolean {
    return this.isInitialized;
  }

  public reset(): void {
    this.sdk = null;
    this.isInitialized = false;
    this.initPromise = null;
  }
}

export const sdkService = SDKService.getInstance();

export async function getOrInitializeSDK(config?: SDKConfig): Promise<SDK> {
  return sdkService.getOrInitializeSDK(config);
}
```

**Usage:**

```typescript
import { getOrInitializeSDK } from './services/sdk.service';

async function main() {
  const sdk = await getOrInitializeSDK({
    application_id: process.env.MACHHUB_APP_ID!,
    httpUrl: process.env.MACHHUB_HTTP_URL,
    mqttUrl: process.env.MACHHUB_MQTT_URL
  });
  
  const items = await sdk.collection('items').getAll();
}
```

---

### Template 3: Environment Configuration

**File:** `src/lib/config.ts`

**Purpose:** Centralized configuration for MACHHUB SDK

**Code:**

```typescript
// filepath: src/lib/config.ts
import type { SDKConfig } from '@machhub-dev/sdk-ts';

export const machhubConfig: SDKConfig = {
  application_id: process.env.MACHHUB_APP_ID || '',
  httpUrl: process.env.MACHHUB_HTTP_URL,
  mqttUrl: process.env.MACHHUB_MQTT_URL,
  natsUrl: process.env.MACHHUB_NATS_URL,
  developer_key: process.env.MACHHUB_DEVELOPER_KEY
};

// Validation
export function validateConfig(): boolean {
  if (!machhubConfig.application_id) {
    console.error('MACHHUB_APP_ID is required');
    return false;
  }
  return true;
}
```

**Environment File (.env):**

```bash
# .env
MACHHUB_APP_ID=your-app-id
MACHHUB_HTTP_URL=http://localhost:80
MACHHUB_MQTT_URL=mqtt://localhost:1883
MACHHUB_NATS_URL=nats://localhost:4222
MACHHUB_DEVELOPER_KEY=your-developer-key
```

**Usage:**

```typescript
import { getOrInitializeSDK } from './services/sdk.service';
import { machhubConfig, validateConfig } from './lib/config';

async function main() {
  if (!validateConfig()) {
    throw new Error('Invalid MACHHUB configuration');
  }
  
  const sdk = await getOrInitializeSDK(machhubConfig);
}
```

---

### Template 4: SPA Entry Point

**File:** `src/main.ts` or `src/index.ts`

**Purpose:** Initialize SDK on SPA application startup

**Code:**

```typescript
// filepath: src/main.ts
import { getOrInitializeSDK } from './services/sdk.service';
import { machhubConfig } from './lib/config';

async function initializeApp() {
  try {
    console.log('Initializing MACHHUB SDK...');
    await getOrInitializeSDK(machhubConfig);
    console.log('MACHHUB SDK ready!');
    
    // Continue with app initialization
    startApp();
  } catch (error) {
    console.error('Failed to initialize app:', error);
    showErrorScreen('Failed to connect to MACHHUB');
  }
}

function startApp() {
  // Your app initialization logic
  console.log('App started');
}

function showErrorScreen(message: string) {
  document.body.innerHTML = `
    <div style="text-align: center; padding: 50px;">
      <h1>Initialization Error</h1>
      <p>${message}</p>
      <button onclick="location.reload()">Retry</button>
    </div>
  `;
}

// Start the app
initializeApp();
```

---

## Initialization Checklist

When implementing SDK initialization, ensure:

- [ ] **Singleton pattern** used (SDKService class)
- [ ] **Correct method chosen** (Designer Extension for VSCode, Manual for production)
- [ ] **Initialize once** at app startup/root component
- [ ] **Browser check** included (SSR only - not needed for SPAs)
- [ ] **Error handling** implemented with try-catch
- [ ] **Environment variables** configured (if using Method 2)
- [ ] **getOrInitializeSDK()** helper function exported
- [ ] **Reset method** available for testing
- [ ] **Initialization checked** before using SDK
- [ ] **SPA or SSR** deployment type identified

---

## Common Issues

### Issue: "SDK not initialized"

**Solution:** Always call `getOrInitializeSDK()` instead of directly accessing the SDK.

```typescript
// ❌ Wrong
const sdk = sdkService.getSDK(); // Throws if not initialized

// ✅ Correct
const sdk = await getOrInitializeSDK(); // Initializes if needed
```

### Issue: "Designer Extension not found"

**Solution:** 
1. Install MACHHUB Designer Extension in VSCode
2. Ensure extension is enabled and configured
3. OR switch to Manual Configuration method

### Issue: SSR hydration mismatch (SSR frameworks only)

**Note:** This does not apply to SPA deployments (SPAs always run in browser).

**Solution for SSR:** Always check browser environment before initializing

```typescript
if (typeof window === 'undefined') {
  return false; // Skip initialization during SSR
}
```

---

## Quick Reference

### Designer Extension (Method 1)
```typescript
const sdk = await getOrInitializeSDK();
```

### Manual Configuration (Method 2)
```typescript
const sdk = await getOrInitializeSDK({
  application_id: 'your-app',
  httpUrl: 'http://localhost:80'
});
```

---

## Next Steps

After initializing the SDK:
1. **Set up service layer** → See `machhub-sdk-architecture`
2. **Create/read data** → See `machhub-sdk-collections`
3. **Implement auth** → See `machhub-sdk-authentication`
4. **Add real-time** → See `machhub-sdk-realtime`

---

## Resources

- **Documentation**: https://docs.machhub.dev
- **NPM Package**: https://www.npmjs.com/package/@machhub-dev/sdk-ts
- **GitHub**: https://github.com/machhub-dev/sdk-ts
- **MACHHUB Designer Extension**: Available in VS Code Marketplace
