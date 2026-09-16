// filepath: composables/useCollection.ts
import type { SDK } from '@machhub-dev/sdk-ts';

export function useCollection<T = any>(collectionName: string) {
    const { $sdk } = useNuxtApp();
    const sdk = $sdk as SDK;

    const items = ref<T[]>([]);
    const loading = ref(false);
    const error = ref<Error | null>(null);

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
        loading.value = true;
        error.value = null;

        try {
            const rawItems = await sdk.collection(collectionName).getAll();
            const transformed = rawItems.map(transform);
            items.value = transformed;
            return transformed;
        } catch (err) {
            const e = err instanceof Error ? err : new Error('Unknown error');
            error.value = e;
            throw e;
        } finally {
            loading.value = false;
        }
    }

    async function getOne(id: string): Promise<T | null> {
        loading.value = true;
        error.value = null;

        try {
            const fullId = `myapp.${collectionName}:${id}`;
            const item = await sdk.collection(collectionName).getOne(fullId);
            return item ? transform(item) : null;
        } catch (err) {
            const e = err instanceof Error ? err : new Error('Unknown error');
            error.value = e;
            throw e;
        } finally {
            loading.value = false;
        }
    }

    async function create(data: Partial<T>): Promise<T> {
        loading.value = true;
        error.value = null;

        try {
            const created = await sdk.collection(collectionName).create(data);
            const item = transform(created);
            items.value.push(item);
            return item;
        } catch (err) {
            const e = err instanceof Error ? err : new Error('Unknown error');
            error.value = e;
            throw e;
        } finally {
            loading.value = false;
        }
    }

    async function update(id: string, updates: Partial<T>): Promise<T> {
        loading.value = true;
        error.value = null;

        try {
            const fullId = `myapp.${collectionName}:${id}`;
            const updated = await sdk.collection(collectionName).update(fullId, updates);
            const item = transform(updated);

            const index = items.value.findIndex((i: any) => i.id === id);
            if (index !== -1) {
                items.value[index] = item;
            }

            return item;
        } catch (err) {
            const e = err instanceof Error ? err : new Error('Unknown error');
            error.value = e;
            throw e;
        } finally {
            loading.value = false;
        }
    }

    async function remove(id: string): Promise<void> {
        loading.value = true;
        error.value = null;

        try {
            const fullId = `myapp.${collectionName}:${id}`;
            await sdk.collection(collectionName).delete(fullId);
            items.value = items.value.filter((i: any) => i.id !== id);
        } catch (err) {
            const e = err instanceof Error ? err : new Error('Unknown error');
            error.value = e;
            throw e;
        } finally {
            loading.value = false;
        }
    }

    return {
        items: readonly(items),
        loading: readonly(loading),
        error: readonly(error),
        getAll,
        getOne,
        create,
        update,
        remove
    };
}
