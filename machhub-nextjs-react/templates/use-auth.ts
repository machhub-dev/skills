// filepath: src/hooks/useAuth.ts
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSDK } from '@/contexts/SDKContext';

interface User {
    id: string;
    username: string;
    email?: string;
    [key: string]: any;
}

export function useAuth() {
    const sdk = useSDK();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        checkAuth();
    }, [sdk]);

    const checkAuth = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const currentUser = await sdk.auth.getCurrentUser();
            setUser(currentUser);
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error');
            setError(error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, [sdk]);

    const login = useCallback(async (username: string, password: string) => {
        setLoading(true);
        setError(null);

        try {
            const success = await sdk.auth.login(username, password);

            if (success) {
                const currentUser = await sdk.auth.getCurrentUser();
                setUser(currentUser);
                return true;
            }

            return false;
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Login failed');
            setError(error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [sdk]);

    const logout = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            await sdk.auth.logout();
            setUser(null);
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Logout failed');
            setError(error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [sdk]);

    const hasPermission = useCallback(async (permission: string): Promise<boolean> => {
        try {
            return await sdk.auth.hasPermission(permission);
        } catch (err) {
            console.error('Permission check failed:', err);
            return false;
        }
    }, [sdk]);

    return {
        user,
        loading,
        error,
        isAuthenticated: !!user,
        login,
        logout,
        checkAuth,
        hasPermission
    };
}
