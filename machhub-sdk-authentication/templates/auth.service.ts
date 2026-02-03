// filepath: src/services/auth.service.ts
import { getOrInitializeSDK } from './sdk.service';
import type { SDK } from '@machhub-dev/sdk-ts';

export interface User {
    id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    groups?: string[];
    permissions?: string[];
}

export interface LoginCredentials {
    username: string;
    password: string;
}

class AuthService {
    private sdk: SDK | null = null;
    private currentUser: User | null = null;

    private async getSDK(): Promise<SDK> {
        if (!this.sdk) {
            this.sdk = await getOrInitializeSDK();
        }
        return this.sdk;
    }

    /**
     * Login user
     */
    async login(username: string, password: string): Promise<User> {
        try {
            const sdk = await this.getSDK();
            await sdk.auth.login(username, password);

            const user = await sdk.auth.getCurrentUser();
            this.currentUser = this.transformUser(user);

            return this.currentUser;
        } catch (error) {
            console.error('Login failed:', error);
            throw new Error('Invalid credentials');
        }
    }

    /**
     * Logout user
     */
    async logout(): Promise<void> {
        try {
            const sdk = await this.getSDK();
            await sdk.auth.logout();
            this.currentUser = null;
        } catch (error) {
            console.error('Logout failed:', error);
            throw error;
        }
    }

    /**
     * Get current authenticated user
     */
    async getCurrentUser(): Promise<User | null> {
        try {
            if (this.currentUser) {
                return this.currentUser;
            }

            const sdk = await this.getSDK();
            const user = await sdk.auth.getCurrentUser();

            if (user) {
                this.currentUser = this.transformUser(user);
                return this.currentUser;
            }

            return null;
        } catch (error) {
            console.error('Failed to get current user:', error);
            return null;
        }
    }

    /**
     * Check if user is authenticated
     */
    async isAuthenticated(): Promise<boolean> {
        const user = await this.getCurrentUser();
        return user !== null;
    }

    /**
     * Validate JWT token
     */
    async validateToken(): Promise<boolean> {
        try {
            const sdk = await this.getSDK();
            const jwtData = sdk.auth.getJWTData();

            if (!jwtData) {
                return false;
            }

            // Check expiration
            const now = Math.floor(Date.now() / 1000);
            return jwtData.exp > now;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get JWT data
     */
    getJWTData(): any {
        try {
            const sdk = this.sdk;
            return sdk?.auth.getJWTData() || null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Check if user has permission
     */
    async hasPermission(permission: string): Promise<boolean> {
        try {
            const sdk = await this.getSDK();
            return await sdk.auth.hasPermission(permission);
        } catch (error) {
            console.error('Permission check failed:', error);
            return false;
        }
    }

    /**
     * Check if user has any of the permissions
     */
    async hasAnyPermission(permissions: string[]): Promise<boolean> {
        for (const permission of permissions) {
            if (await this.hasPermission(permission)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if user has all permissions
     */
    async hasAllPermissions(permissions: string[]): Promise<boolean> {
        for (const permission of permissions) {
            if (!(await this.hasPermission(permission))) {
                return false;
            }
        }
        return true;
    }

    /**
     * Check if user belongs to group
     */
    async isInGroup(groupName: string): Promise<boolean> {
        try {
            const sdk = await this.getSDK();
            return await sdk.auth.isInGroup(groupName);
        } catch (error) {
            console.error('Group check failed:', error);
            return false;
        }
    }

    /**
     * Get user's groups
     */
    async getUserGroups(): Promise<string[]> {
        try {
            const user = await this.getCurrentUser();
            return user?.groups || [];
        } catch (error) {
            console.error('Failed to get user groups:', error);
            return [];
        }
    }

    /**
     * Transform user from API format
     */
    private transformUser(raw: any): User {
        return {
            id: raw.id,
            username: raw.username,
            email: raw.email,
            firstName: raw.firstName,
            lastName: raw.lastName,
            groups: raw.groups || [],
            permissions: raw.permissions || []
        };
    }
}

export const authService = new AuthService();
