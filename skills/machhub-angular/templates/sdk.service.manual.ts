// filepath: src/app/services/sdk.service.manual.ts
import { Injectable } from '@angular/core';
import { SDK, type SDKConfig } from '@machhub-dev/sdk-ts';
import { environment } from '../../environments/environment';

/**
 * MACHHUB SDK Service - Manual Configuration (Production)
 * 
 * Use this version for production deployments with manual configuration.
 * For development with Designer Extension, use sdk.service.ts instead.
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

    async initialize(config?: SDKConfig): Promise<boolean> {
        if (this.isInitialized) {
            return true;
        }

        try {
            const sdkConfig = config || environment.machhub;
            const success = await this.sdk.Initialize(sdkConfig);
            this.isInitialized = success;

            if (success) {
                console.log('MACHHUB SDK initialized successfully');
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
