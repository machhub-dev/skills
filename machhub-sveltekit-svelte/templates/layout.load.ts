// filepath: src/routes/+layout.ts
import { initializeSDK } from '$lib/sdk.service';
import { browser } from '$app/environment';
import type { LayoutLoad } from './$types';

export const ssr = false; // Client-side only
export const prerender = false;

export const load: LayoutLoad = async () => {
    if (browser) {
        try {
            await initializeSDK();
        } catch (error) {
            console.error('Failed to initialize SDK:', error);
            return {
                sdkError: error instanceof Error ? error.message : 'Failed to initialize SDK'
            };
        }
    }

    return {};
};
