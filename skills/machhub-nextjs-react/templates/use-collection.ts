// filepath: src/hooks/useCollection.ts
'use client';

import { useState, useCallback } from 'react';
import { useSDK } from '@/contexts/SDKContext';

export function useCollection<T = any>(collectionName: string) {
    const sdk = useSDK();
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const transform = useCallback((raw: any): T => {
        if (raw.id && typeof raw.id === 'object' && raw.id.ID) {
            return { ...raw, id: raw.id.ID } as T;
        }
        if (raw.id && typeof raw.id === 'string' && raw.id.includes(':')) {
            return { ...raw, id: raw.id.split(':')[1] } as T;
        }
        return raw as T;
    }, []);

    const getAll = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const rawItems = await sdk.collection(collectionName).getAll();
            const transformed = rawItems.map(transform);
            setItems(transformed);
            return transformed;
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error');
            setError(error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [sdk, collectionName, transform]);

    const getOne = useCallback(async (id: string): Promise<T | null> => {
        setLoading(true);
        setError(null);

        try {
            const fullId = `myapp.${collectionName}:${id}`;
            const item = await sdk.collection(collectionName).getOne(fullId);
            return item ? transform(item) : null;
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error');
            setError(error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [sdk, collectionName, transform]);

    const create = useCallback(async (data: Partial<T>): Promise<T> => {
        setLoading(true);
        setError(null);

        try {
            const created = await sdk.collection(collectionName).create(data);
            const item = transform(created);
            setItems(prev => [...prev, item]);
            return item;
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error');
            setError(error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [sdk, collectionName, transform]);

    const update = useCallback(async (id: string, updates: Partial<T>): Promise<T> => {
        setLoading(true);
        setError(null);

        try {
            const fullId = `myapp.${collectionName}:${id}`;
            const updated = await sdk.collection(collectionName).update(fullId, updates);
            const item = transform(updated);
            setItems(prev => prev.map(i => (i as any).id === id ? item : i));
            return item;
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error');
            setError(error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [sdk, collectionName, transform]);

    const remove = useCallback(async (id: string): Promise<void> => {
        setLoading(true);
        setError(null);

        try {
            const fullId = `myapp.${collectionName}:${id}`;
            await sdk.collection(collectionName).delete(fullId);
            setItems(prev => prev.filter(i => (i as any).id !== id));
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error');
            setError(error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [sdk, collectionName]);

    return {
        items,
        loading,
        error,
        getAll,
        getOne,
        create,
        update,
        remove
    };
}
