// filepath: src/services/authorization.service.ts
import { getOrInitializeSDK } from './sdk.service';
import type { Feature, Group } from '@machhub-dev/sdk-ts';
import { RecordIDToString } from '@machhub-dev/sdk-ts';

class AuthorizationService {
    /**
     * Check if the current user has a specific permission.
     * @param feature - e.g. 'collections', 'flows', 'users'
     * @param action  - e.g. 'read', 'read-write', or a custom action string
     * @param scope   - any string, e.g. 'self', 'domain', 'nil', or a custom scope
     */
    async canAccess(feature: string, action: string, scope: string): Promise<boolean> {
        try {
            const sdk = await getOrInitializeSDK();
            const { permission } = await sdk.auth.checkPermission(feature, action, scope);
            return permission;
        } catch (error) {
            console.error('Permission check failed:', error);
            return false;
        }
    }

    /**
     * Get all actions the current user is allowed for a feature/scope.
     */
    async getAllowedActions(feature: string, scope: string): Promise<string[]> {
        try {
            const sdk = await getOrInitializeSDK();
            const { actions } = await sdk.auth.checkAction(feature, scope);
            return actions ?? [];
        } catch (error) {
            console.error('Failed to get allowed actions:', error);
            return [];
        }
    }

    /** Fetch all domain groups (includes their features/permissions). */
    async getGroups(): Promise<Group[]> {
        const sdk = await getOrInitializeSDK();
        return sdk.auth.getGroups();
    }

    /** Fetch all permissions defined in the current domain. */
    async getDomainPermissions(): Promise<Feature[]> {
        try {
            const sdk = await getOrInitializeSDK();
            return await sdk.auth.getPermissions();
        } catch (error) {
            console.error('Failed to get domain permissions:', error);
            return [];
        }
    }

    /** Create a new group with optional initial permissions. */
    async createGroup(name: string, features: Feature[] = []): Promise<Group> {
        const sdk = await getOrInitializeSDK();
        return sdk.auth.createGroup(name, features);
    }

    /** Assign a user to a group. */
    async addUserToGroup(userId: string, groupId: string): Promise<void> {
        const sdk = await getOrInitializeSDK();
        await sdk.auth.addUserToGroup(userId, groupId);
    }

    /**
     * Add permissions to an existing group.
     * Valid scopes: 'self' | 'domain' | 'nil'
     */
    async addPermissionsToGroup(groupId: string, permissions: Feature[]): Promise<void> {
        const sdk = await getOrInitializeSDK();
        await sdk.auth.addPermissionsToGroup(groupId, permissions);
    }

    /** Get all groups the current user belongs to. */
    async getCurrentUserGroups(): Promise<Group[]> {
        const sdk = await getOrInitializeSDK();
        const user = await sdk.auth.getCurrentUser();
        const groupIds = user.group_ids ?? [];
        if (groupIds.length === 0) return [];
        const all = await sdk.auth.getGroups();
        return all.filter(g => g.id && groupIds.includes(RecordIDToString(g.id)));
    }
}

export const authorizationService = new AuthorizationService();
