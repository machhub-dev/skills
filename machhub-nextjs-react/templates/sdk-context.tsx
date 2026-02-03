// filepath: src/contexts/SDKContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { SDK } from '@machhub-dev/sdk-ts';

/**
 * MACHHUB SDK Context - Zero Configuration (Designer Extension)
 * 
 * This uses the MACHHUB Designer Extension for automatic configuration.
 * Perfect for rapid development - just install the extension and start coding!
 * 
 * For production deployments with manual configuration, see SDKContext.manual.tsx
 */

interface SDKContextType {
    sdk: SDK | null;
    initialized: boolean;
    error: Error | null;
}

const SDKContext = createContext<SDKContextType>({
    sdk: null,
    initialized: false,
    error: null
});

export function SDKProvider({ children }: { children: React.ReactNode; }) {
    const [sdk] = useState(() => new SDK());
    const [initialized, setInitialized] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let mounted = true;

        async function initializeSDK() {
            try {
                const success = await sdk.Initialize();

                if (mounted) {
                    if (success) {
                        setInitialized(true);
                        console.log('MACHHUB SDK initialized successfully!');
                    } else {
                        setError(new Error('SDK initialization returned false'));
                    }
                }
            } catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err : new Error('Unknown error'));
                    console.error('MACHHUB SDK initialization error:', err);
                }
            }
        }

        initializeSDK();

        return () => {
            mounted = false;
        };
    }, [sdk]);

    return (
        <SDKContext.Provider value={{ sdk, initialized, error }}>
            {children}
        </SDKContext.Provider>
    );
}

export function useSDK() {
    const context = useContext(SDKContext);

    if (!context.initialized) {
        throw new Error('SDK not initialized yet');
    }

    if (!context.sdk) {
        throw new Error('SDK is null');
    }

    return context.sdk;
}

export function useSDKState() {
    return useContext(SDKContext);
}
