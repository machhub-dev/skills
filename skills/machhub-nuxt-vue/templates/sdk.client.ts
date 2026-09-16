// filepath: plugins/sdk.client.ts
import { SDK } from '@machhub-dev/sdk-ts';

/**
 * MACHHUB SDK Plugin - Zero Configuration (Designer Extension)
 * 
 * This plugin uses the MACHHUB Designer Extension for automatic configuration.
 * Perfect for rapid development - just install the extension and start coding!
 * 
 * For production deployments with manual configuration, see sdk.client.manual.ts
 */

export default defineNuxtPlugin(async () => {
    const sdk = new SDK();

    try {
        const success = await sdk.Initialize();

        if (success) {
            console.log('MACHHUB SDK initialized successfully!');
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
