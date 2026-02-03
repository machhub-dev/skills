// filepath: src/app/services/sdk.service.ts
import { Injectable } from '@angular/core';
import { SDK } from '@machhub-dev/sdk-ts';

/**
 * MACHHUB SDK Service - Zero Configuration (Designer Extension)
 * 
 * This service uses the MACHHUB Designer Extension for automatic configuration.
 * Perfect for rapid development - just install the extension and start coding!
 * 
 * For production deployments with manual configuration, see sdk.service.manual.ts
 */
@Injectable({
    providedIn: 'root'
})
export class SDKService {
    private sdk: SDK;
    private isInitialized = false;

    constructor() {
        this.sdk = new SDK();
    }

    async initialize(): Promise<boolean> {
        if (this.isInitialized) {
            return true;
        }

        try {
            const success = await this.sdk.Initialize();
            this.isInitialized = success;

            if (success) {
                console.log('MACHHUB SDK initialized successfully!');
            } else {
                console.error('MACHHUB SDK initialization failed');
            }

            return success;
        } catch (error) {
            console.error('Error initializing MACHHUB SDK:', error);
            return false;
        }
    }

    getSDK(): SDK {
        if (!this.isInitialized) {
            throw new Error('SDK not initialized');
        }
        return this.sdk;
    }

    get initialized(): boolean {
        return this.isInitialized;
    }
}
