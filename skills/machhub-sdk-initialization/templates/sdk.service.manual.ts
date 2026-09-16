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
