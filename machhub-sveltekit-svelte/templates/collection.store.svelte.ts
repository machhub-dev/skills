// filepath: src/lib/stores/collection.svelte.ts
import { getSDK } from '$lib/sdk.service';

export function createCollectionStore<T = any>(collectionName: string) {
    let items = $state<T[]>([]);
    let loading = $state(false);
    let error = $state<Error | null>(null);

    function transform(raw: any): T {
        if (raw.id && typeof raw.id === 'object' && raw.id.ID) {
            return { ...raw, id: raw.id.ID } as T;
        }
        if (raw.id && typeof raw.id === 'string' && raw.id.includes(':')) {
            return { ...raw, id: raw.id.split(':')[1] } as T;
        }
        return raw as T;
    }

    async function getAll(): Promise<T[]> {
        loading = true;
        error = null;

        try {
            const sdk = getSDK();
            const rawItems = await sdk.collection(collectionName).getAll();
            const transformed = rawItems.map(transform);
            items = transformed;
            return transformed;
        } catch (err) {
            const e = err instanceof Error ? err : new Error('Unknown error');
            error = e;
            throw e;
        } finally {
            loading = false;
        }
    }

    async function getOne(id: string): Promise<T | null> {
        loading = true;
        error = null;

        try {
            const sdk = getSDK();
            const fullId = `myapp.${collectionName}:${id}`;
            const item = await sdk.collection(collectionName).getOne(fullId);
            return item ? transform(item) : null;
        } catch (err) {
            const e = err instanceof Error ? err : new Error('Unknown error');
            error = e;
            throw e;
        } finally {
            loading = false;
        }
    }

    async function create(data: Partial<T>): Promise<T> {
        loading = true;
        error = null;

        try {
            const sdk = getSDK();
            const created = await sdk.collection(collectionName).create(data);
            const item = transform(created);
            items = [...items, item];
            return item;
        } catch (err) {
            const e = err instanceof Error ? err : new Error('Unknown error');
            error = e;
            throw e;
        } finally {
            loading = false;
        }
    }

    async function update(id: string, updates: Partial<T>): Promise<T> {
        loading = true;
        error = null;

        try {
            const sdk = getSDK();
            const fullId = `myapp.${collectionName}:${id}`;
            const updated = await sdk.collection(collectionName).update(fullId, updates);
            const item = transform(updated);
            items = items.map((i: any) => (i.id === id ? item : i));
            return item;
        } catch (err) {
            const e = err instanceof Error ? err : new Error('Unknown error');
            error = e;
            throw e;
        } finally {
            loading = false;
        }
    }

    async function remove(id: string): Promise<void> {
        loading = true;
        error = null;

        try {
            const sdk = getSDK();
            const fullId = `myapp.${collectionName}:${id}`;
            await sdk.collection(collectionName).delete(fullId);
            items = items.filter((i: any) => i.id !== id);
        } catch (err) {
            const e = err instanceof Error ? err : new Error('Unknown error');
            error = e;
            throw e;
        } finally {
            loading = false;
        }
    }

    return {
        get items() {
            return items;
        },
        get loading() {
            return loading;
        },
        get error() {
            return error;
        },
        getAll,
        getOne,
        create,
        update,
        remove
    };
}
