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

- âœ… Production deployments (SPA & SSR)
- âœ… CI/CD pipelines
- âœ… Environments without MACHHUB Designer Extension
- âœ… SPA applications (React, Vue, Angular, etc.)
- âœ… SSR applications (Next.js, Nuxt, SvelteKit, etc.)
- âœ… Custom connection requirements
- âœ… Multiple environment configurations

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

- âœ… **Pure client-side** - All code runs in browser
- âœ… **No SSR concerns** - No server-side rendering to handle
- âœ… **Direct SDK usage** - No browser environment checks needed
- âœ… **Simpler configuration** - No hybrid client/server setup

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
| **Browser Check**   | âŒ Not needed      | âœ… Required               |
| **Initialization**  | On app mount      | On client-side hydration |
| **Environment**     | Always browser    | Server + Browser         |
| **Complexity**      | ðŸŸ¢ Simple          | ðŸŸ¡ Moderate               |
| **MACHHUB Runtime** | âœ… Fully supported | âœ… Fully supported        |

---

## Choosing the Right Method

### Decision Matrix

| Factor                    | Designer Extension     | Manual Config      |
| ------------------------- | ---------------------- | ------------------ |
| **Development in VSCode** | âœ… Perfect              | âš ï¸ More setup       |
| **Production Deploy**     | âŒ Not available        | âœ… Required         |
| **SPA Applications**      | âœ… Dev only             | âœ… Full support     |
| **SSR Applications**      | âŒ Limited              | âœ… Full support     |
| **CI/CD Pipeline**        | âŒ Not suitable         | âœ… Ideal            |
| **Configuration Needed**  | ðŸŸ¢ Zero config          | ðŸŸ¡ Environment vars |
| **Credential Management** | ðŸŸ¢ Handled by extension | ðŸŸ¡ Must secure      |

### Quick Decision Guide

```typescript
// ðŸŽ¯ Are you developing in VSCode with MACHHUB Designer Extension?
//    â†’ Use Method 1 (Designer Extension)
const sdk = await getOrInitializeSDK(); // No config!

// âš™ï¸ Are you deploying to production (SPA or SSR)?
//    â†’ Use Method 2 (Manual Configuration)
const sdk = await getOrInitializeSDK({
  application_id: process.env.MACHHUB_APP_ID!,
  httpUrl: process.env.MACHHUB_HTTP_URL
});
```

---

## Singleton Pattern (CRITICAL)

**The SDK MUST be initialized ONCE and reused throughout the application.**

### Why Singleton?

- âœ… Single connection pool
- âœ… Consistent state management
- âœ… Better performance (avoid reconnections)
- âœ… Proper cleanup and lifecycle management

### Anti-Patterns to Avoid

```typescript
// âŒ WRONG - Creating multiple instances
async function getData() {
  const sdk = new SDK();
  await sdk.Initialize();
  return sdk.collection('items').getAll();
}

// âŒ WRONG - Initializing in every function
async function createItem(data) {
  const sdk = new SDK();
  await sdk.Initialize({ application_id: 'app' });
  return sdk.collection('items').create(data);
}

// âœ… CORRECT - Use singleton service
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
