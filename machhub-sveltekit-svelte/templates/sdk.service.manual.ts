// filepath: src/lib/sdk.service.manual.ts
import { SDK, type SDKConfig } from '@machhub-dev/sdk-ts';
import { PUBLIC_MACHHUB_APP_ID, PUBLIC_MACHHUB_HTTP_URL, PUBLIC_MACHHUB_MQTT_URL, PUBLIC_MACHHUB_NATS_URL } from '$env/static/public';

/**
 * MACHHUB SDK Service - Manual Configuration (Production)
 * 
 * Use this version for production deployments with manual configuration.
 * For development with Designer Extension, use sdk.service.ts instead.
 */

let sdk: SDK | null = null;
let initPromise: Promise<boolean> | null = null;

export function getSDK(): SDK {
    if (!sdk) {
        throw new Error('SDK not initialized. Call initializeSDK() first.');
    }
    return sdk;
}

export async function initializeSDK(config?: SDKConfig): Promise<boolean> {
    if (sdk) {
        return true;
    }

    if (initPromise) {
        return initPromise;
    }

    initPromise = (async () => {
        try {
            const sdkConfig = config || {
                application_id: PUBLIC_MACHHUB_APP_ID,
                httpUrl: PUBLIC_MACHHUB_HTTP_URL,
                mqttUrl: PUBLIC_MACHHUB_MQTT_URL,
                natsUrl: PUBLIC_MACHHUB_NATS_URL
            };

            sdk = new SDK();
            const success = await sdk.Initialize(sdkConfig);

            if (success) {
                console.log('MACHHUB SDK initialized successfully');
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
