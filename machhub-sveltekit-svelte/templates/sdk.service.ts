// filepath: src/lib/sdk.service.ts
import { SDK } from '@machhub-dev/sdk-ts';

/**
 * MACHHUB SDK Service - Zero Configuration (Designer Extension)
 * 
 * This service uses the MACHHUB Designer Extension for automatic configuration.
 * Perfect for rapid development - just install the extension and start coding!
 * 
 * For production deployments with manual configuration, see sdk.service.manual.ts
 */

let sdk: SDK | null = null;
let initPromise: Promise<boolean> | null = null;

export function getSDK(): SDK {
    if (!sdk) {
        throw new Error('SDK not initialized. Call initializeSDK() first.');
    }
    return sdk;
}

export async function initializeSDK(): Promise<boolean> {
    if (sdk) {
        return true;
    }

    if (initPromise) {
        return initPromise;
    }

    initPromise = (async () => {
        try {
            sdk = new SDK();
            const success = await sdk.Initialize();

            if (success) {
                console.log('MACHHUB SDK initialized successfully!');
                return true;
            } else {
                console.error('MACHHUB SDK initialization failed');
                sdk = null;
                return false;
            }
        } catch (error) {
            console.error('Error initializing MACHHUB SDK:', error);
            sdk = null;
            throw error;
        }
    })();

    return initPromise;
}

export function isSDKInitialized(): boolean {
    return sdk !== null;
}
