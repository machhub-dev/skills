// filepath: plugins/sdk.client.manual.ts
import { SDK, type SDKConfig } from '@machhub-dev/sdk-ts';

/**
 * MACHHUB SDK Plugin - Manual Configuration (Production)
 * 
 * Use this version for production deployments with manual configuration.
 * For development with Designer Extension, use sdk.client.ts instead.
 */

export default defineNuxtPlugin(async () => {
    const config = useRuntimeConfig();
    const sdk = new SDK();

    try {
        const sdkConfig: SDKConfig = {
            application_id: config.public.machhub.applicationId,
            httpUrl: config.public.machhub.httpUrl,
            mqttUrl: config.public.machhub.mqttUrl,
            natsUrl: config.public.machhub.natsUrl
        };

        const success = await sdk.Initialize(sdkConfig);

        if (success) {
            console.log('MACHHUB SDK initialized successfully');
        } else {
            console.error('MACHHUB SDK initialization failed');
        }

        return {
            provide: {
                sdk
            }
        };
    } catch (error) {
        console.error('Error initializing MACHHUB SDK:', error);
        throw error;
    }
});
