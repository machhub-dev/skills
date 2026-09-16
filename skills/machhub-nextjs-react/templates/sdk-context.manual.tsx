// filepath: src/contexts/SDKContext.manual.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { SDK, type SDKConfig } from '@machhub-dev/sdk-ts';

/**
 * MACHHUB SDK Context - Manual Configuration (Production)
 * 
 * Use this version for production deployments with manual configuration.
 * For development with Designer Extension, use SDKContext.tsx instead.
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

interface SDKProviderProps {
    children: React.ReactNode;
    config?: SDKConfig;
}

export function SDKProvider({ children, config }: SDKProviderProps) {
    const [sdk] = useState(() => new SDK());
    const [initialized, setInitialized] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let mounted = true;

        async function initializeSDK() {
            try {
                const sdkConfig = config || {
                    application_id: process.env.NEXT_PUBLIC_MACHHUB_APP_ID!,
                    httpUrl: process.env.NEXT_PUBLIC_MACHHUB_HTTP_URL!,
                    mqttUrl: process.env.NEXT_PUBLIC_MACHHUB_MQTT_URL!,
                    natsUrl: process.env.NEXT_PUBLIC_MACHHUB_NATS_URL!
                };

                const success = await sdk.Initialize(sdkConfig);

                if (mounted) {
                    if (success) {
                        setInitialized(true);
                        console.log('MACHHUB SDK initialized successfully');
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
    }, [sdk, config]);

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
