import { SDK, type SDKConfig } from '@machhub-dev/sdk-ts';
import { browser } from '$app/environment';

/**
 * Singleton SDK Service for managing the MACHHUB SDK instance
 * This service ensures a single SDK instance is used throughout the application
 */
class SDKService {
  private static instance: SDKService | null = null;
  private sdk: SDK | null = null;
  private isInitialized = false;
  private initPromise: Promise<boolean> | null = null;

  private constructor() {
    this.sdk = new SDK();
  }

  /**
   * Gets the singleton instance of SDKService
   */
  public static getInstance(): SDKService {
    if (!SDKService.instance) {
      SDKService.instance = new SDKService();
    }
    return SDKService.instance;
  }

  /**
   * Initializes the SDK with the provided configuration
   * This method is safe to call multiple times - it will only initialize once
   * 
   * @param config - SDK configuration options
   * @returns Promise<boolean> - true if initialized successfully
   */
  public async initialize(config?: SDKConfig): Promise<boolean> {
    // Only initialize in browser environment (skip for SSR)
    if (!browser) {
      console.warn('SDK can only be initialized in browser environment');
      return false;
    }

    // If already initialized, return true
    if (this.isInitialized) {
      return true;
    }

    // If initialization is in progress, wait for it
    if (this.initPromise) {
      return this.initPromise;
    }

    // Start initialization
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

  /**
   * Gets the SDK instance
   * Throws an error if SDK is not initialized
   */
  public getSDK(): SDK {
    if (!this.isInitialized || !this.sdk) {
      throw new Error(
        'SDK is not initialized. Call SDKService.getInstance().initialize() first.'
      );
    }
    return this.sdk;
  }

  /**
   * Gets the SDK instance, initializing it first if needed
   * This is the recommended method to use in components
   * 
   * @param config - SDK configuration options (used only if SDK is not initialized)
   * @returns Promise<SDK> - The initialized SDK instance
   */
  public async getOrInitializeSDK(config?: SDKConfig): Promise<SDK> {
    if (!this.isInitialized) {
      const success = await this.initialize(config);
      if (!success) {
        throw new Error('Failed to initialize SDK');
      }
    }
    return this.getSDK();
  }

  /**
   * Checks if SDK is initialized
   */
  public get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Resets the SDK instance (useful for testing or re-initialization)
   */
  public reset(): void {
    this.sdk = null;
    this.isInitialized = false;
    this.initPromise = null;
  }
}

// Export singleton instance
export const sdkService = SDKService.getInstance();

/**
 * Smart helper function to get SDK - initializes automatically if needed
 * This is the recommended method to use in components and services
 * 
 * @param config - SDK configuration options (used only if SDK is not initialized)
 * @returns Promise<SDK> - The initialized SDK instance
 * 
 * @example
 * ```typescript
 * const sdk = await getOrInitializeSDK();
 * const items = await sdk.collection('items').find({});
 * ```
 */
export async function getOrInitializeSDK(config?: SDKConfig): Promise<SDK> {
  // Configure with your application ID
  return sdkService.getOrInitializeSDK({
    application_id: 'your-app-name',
    ...config
  });
}
