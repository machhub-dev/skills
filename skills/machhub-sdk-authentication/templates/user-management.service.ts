// filepath: src/services/user-management.service.ts
import { getOrInitializeSDK } from './sdk.service';
import type { SDK } from '@machhub-dev/sdk-ts';

export interface Group {
    name: string;
    description?: string;
    permissions: string[];
    users: string[];
}

class UserManagementService {
    private sdk: SDK | null = null;

    private async getSDK(): Promise<SDK> {
        if (!this.sdk) {
            this.sdk = await getOrInitializeSDK();
        }
        return this.sdk;
    }

    // ========== Group Operations ==========

    /**
     * Get all groups
     */
    async getAllGroups(): Promise<Group[]> {
        try {
            const sdk = await this.getSDK();
            return await sdk.auth.getAllGroups();
        } catch (error) {
            console.error('Failed to fetch groups:', error);
            throw error;
        }
    }

    /**
     * Get group by name
     */
    async getGroup(name: string): Promise<Group | null> {
        try {
            const sdk = await this.getSDK();
            return await sdk.auth.getGroup(name);
        } catch (error) {
            console.error(`Failed to fetch group ${name}:`, error);
            return null;
        }
    }

    /**
     * Create group
     */
    async createGroup(group: Group): Promise<Group> {
        try {
            const sdk = await this.getSDK();
            return await sdk.auth.createGroup(group);
        } catch (error) {
            console.error('Failed to create group:', error);
            throw error;
        }
    }

    /**
     * Update group
     */
    async updateGroup(name: string, updates: Partial<Group>): Promise<Group> {
        try {
            const sdk = await this.getSDK();
            return await sdk.auth.updateGroup(name, updates);
        } catch (error) {
            console.error(`Failed to update group ${name}:`, error);
            throw error;
        }
    }

    /**
     * Delete group
     */
    async deleteGroup(name: string): Promise<void> {
        try {
            const sdk = await this.getSDK();
            await sdk.auth.deleteGroup(name);
        } catch (error) {
            console.error(`Failed to delete group ${name}:`, error);
            throw error;
        }
    }

    // ========== User-Group Operations ==========

    /**
     * Add user to group
     */
    async addUserToGroup(username: string, groupName: string): Promise<void> {
        try {
            const sdk = await this.getSDK();
            await sdk.auth.addUserToGroup(username, groupName);
        } catch (error) {
            console.error(`Failed to add user ${username} to group ${groupName}:`, error);
            throw error;
        }
    }

    /**
     * Remove user from group
     */
    async removeUserFromGroup(username: string, groupName: string): Promise<void> {
        try {
            const sdk = await this.getSDK();
            await sdk.auth.removeUserFromGroup(username, groupName);
        } catch (error) {
            console.error(`Failed to remove user ${username} from group ${groupName}:`, error);
            throw error;
        }
    }

    /**
     * Get users in group
     */
    async getUsersInGroup(groupName: string): Promise<string[]> {
        try {
            const group = await this.getGroup(groupName);
            return group?.users || [];
        } catch (error) {
            console.error(`Failed to get users in group ${groupName}:`, error);
            return [];
        }
    }

    // ========== Permission Operations ==========

    /**
     * Grant permission to group
     */
    async grantPermission(groupName: string, permission: string): Promise<void> {
        try {
            const group = await this.getGroup(groupName);
            if (!group) {
                throw new Error(`Group ${groupName} not found`);
            }

            if (!group.permissions.includes(permission)) {
                group.permissions.push(permission);
                await this.updateGroup(groupName, { permissions: group.permissions });
            }
        } catch (error) {
            console.error(`Failed to grant permission ${permission} to group ${groupName}:`, error);
            throw error;
        }
    }

    /**
     * Revoke permission from group
     */
    async revokePermission(groupName: string, permission: string): Promise<void> {
        try {
            const group = await this.getGroup(groupName);
            if (!group) {
                throw new Error(`Group ${groupName} not found`);
            }

            const index = group.permissions.indexOf(permission);
            if (index > -1) {
                group.permissions.splice(index, 1);
                await this.updateGroup(groupName, { permissions: group.permissions });
            }
        } catch (error) {
            console.error(`Failed to revoke permission ${permission} from group ${groupName}:`, error);
            throw error;
        }
    }

    /**
     * Get permissions for group
     */
    async getGroupPermissions(groupName: string): Promise<string[]> {
        try {
            const group = await this.getGroup(groupName);
            return group?.permissions || [];
        } catch (error) {
            console.error(`Failed to get permissions for group ${groupName}:`, error);
            return [];
        }
    }
}

export const userManagementService = new UserManagementService();
