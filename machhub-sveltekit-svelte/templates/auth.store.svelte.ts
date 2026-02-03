// filepath: src/lib/stores/auth.svelte.ts
import { getSDK } from '$lib/sdk.service';

interface User {
    id: string;
    username: string;
    email?: string;
    [key: string]: any;
}

function createAuthStore() {
    let user = $state<User | null>(null);
    let loading = $state(false);
    let error = $state<Error | null>(null);

    const isAuthenticated = $derived(user !== null);

    async function checkAuth() {
        loading = true;
        error = null;

        try {
            const sdk = getSDK();
            const currentUser = await sdk.auth.getCurrentUser();
            user = currentUser;
        } catch (err) {
            const e = err instanceof Error ? err : new Error('Unknown error');
            error = e;
            user = null;
        } finally {
            loading = false;
        }
    }

    async function login(username: string, password: string): Promise<boolean> {
        loading = true;
        error = null;

        try {
            const sdk = getSDK();
            const success = await sdk.auth.login(username, password);

            if (success) {
                const currentUser = await sdk.auth.getCurrentUser();
                user = currentUser;
                return true;
            }

            return false;
        } catch (err) {
            const e = err instanceof Error ? err : new Error('Login failed');
            error = e;
            throw e;
        } finally {
            loading = false;
        }
    }

    async function logout() {
        loading = true;
        error = null;

        try {
            const sdk = getSDK();
            await sdk.auth.logout();
            user = null;
        } catch (err) {
            const e = err instanceof Error ? err : new Error('Logout failed');
            error = e;
            throw e;
        } finally {
            loading = false;
        }
    }

    async function hasPermission(permission: string): Promise<boolean> {
        try {
            const sdk = getSDK();
            return await sdk.auth.hasPermission(permission);
        } catch (err) {
            console.error('Permission check failed:', err);
            return false;
        }
    }

    return {
        get user() {
            return user;
        },
        get loading() {
            return loading;
        },
        get error() {
            return error;
        },
        get isAuthenticated() {
            return isAuthenticated;
        },
        checkAuth,
        login,
        logout,
        hasPermission
    };
}

export const authStore = createAuthStore();
