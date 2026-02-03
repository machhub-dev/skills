// filepath: composables/useAuth.ts
import type { SDK } from '@machhub-dev/sdk-ts';

interface User {
    id: string;
    username: string;
    email?: string;
    [key: string]: any;
}

export function useAuth() {
    const { $sdk } = useNuxtApp();
    const sdk = $sdk as SDK;

    const user = ref<User | null>(null);
    const loading = ref(false);
    const error = ref<Error | null>(null);

    const isAuthenticated = computed(() => !!user.value);

    async function checkAuth() {
        loading.value = true;
        error.value = null;

        try {
            const currentUser = await sdk.auth.getCurrentUser();
            user.value = currentUser;
        } catch (err) {
            const e = err instanceof Error ? err : new Error('Unknown error');
            error.value = e;
            user.value = null;
        } finally {
            loading.value = false;
        }
    }

    async function login(username: string, password: string): Promise<boolean> {
        loading.value = true;
        error.value = null;

        try {
            const success = await sdk.auth.login(username, password);

            if (success) {
                const currentUser = await sdk.auth.getCurrentUser();
                user.value = currentUser;
                return true;
            }

            return false;
        } catch (err) {
            const e = err instanceof Error ? err : new Error('Login failed');
            error.value = e;
            throw e;
        } finally {
            loading.value = false;
        }
    }

    async function logout() {
        loading.value = true;
        error.value = null;

        try {
            await sdk.auth.logout();
            user.value = null;
        } catch (err) {
            const e = err instanceof Error ? err : new Error('Logout failed');
            error.value = e;
            throw e;
        } finally {
            loading.value = false;
        }
    }

    async function hasPermission(permission: string): Promise<boolean> {
        try {
            return await sdk.auth.hasPermission(permission);
        } catch (err) {
            console.error('Permission check failed:', err);
            return false;
        }
    }

    return {
        user: readonly(user),
        loading: readonly(loading),
        error: readonly(error),
        isAuthenticated,
        checkAuth,
        login,
        logout,
        hasPermission
    };
}
