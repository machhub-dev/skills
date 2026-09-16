// filepath: src/services/auth.service.ts
import { getOrInitializeSDK } from './sdk.service';
import type { SDK } from '@machhub-dev/sdk-ts';

export interface LoginCredentials {
    username: string;
    password: string;
}

class AuthService {
    private sdk: SDK | null = null;
    private currentUser: any = null;

    private async getSDK(): Promise<SDK> {
        if (!this.sdk) {
            this.sdk = await getOrInitializeSDK();
        }
        return this.sdk;
    }

    /**
     * Login user — stores JWT in localStorage (or in-memory for Node.js)
     */
    async login(username: string, password: string): Promise<void> {
        const sdk = await this.getSDK();
        await sdk.auth.login(username, password);
        this.currentUser = await sdk.auth.getCurrentUser();
    }

    /**
     * Logout user — clears stored JWT
     */
    async logout(): Promise<void> {
        const sdk = await this.getSDK();
        await sdk.auth.logout();
        this.currentUser = null;
    }

    /**
     * Get current authenticated user
     */
    async getCurrentUser() {
        if (this.currentUser) return this.currentUser;
        const sdk = await this.getSDK();
        this.currentUser = await sdk.auth.getCurrentUser();
        return this.currentUser;
    }

    /**
     * Validate current session. Returns false if JWT is expired or missing.
     */
    async validateSession(): Promise<boolean> {
        try {
            const sdk = await this.getSDK();
            const { valid } = await sdk.auth.validateCurrentUser();
            return valid;
        } catch {
            return false;
        }
    }

    /**
     * Get decoded JWT payload
     */
    async getJWTData(): Promise<any> {
        const sdk = await this.getSDK();
        return sdk.auth.getJWTData();
    }
}

export const authService = new AuthService();

