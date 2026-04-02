// filepath: src/services/group-management.service.ts
import { getOrInitializeSDK } from './sdk.service';
import type { Feature, Group } from '@machhub-dev/sdk-ts';

class GroupManagementService {
    /**
     * Create a new group.
     * @param name     - Display name (cannot be "Superuser")
     * @param features - Initial permissions (can be empty, add later via addPermissions)
     */
    async createGroup(name: string, features: Feature[] = []): Promise<Group> {
        const sdk = await getOrInitializeSDK();
        return sdk.auth.createGroup(name, features);
    }

    /** Fetch all groups in the current domain (includes user_ids and features). */
    async getGroups(): Promise<Group[]> {
        const sdk = await getOrInitializeSDK();
        return sdk.auth.getGroups();
    }

    /**
     * Get the current permission set of a group.
     * Returns Feature[] — each entry has { name, action, scope }.
     */
    async getGroupPermissions(groupId: string): Promise<Feature[]> {
        const sdk = await getOrInitializeSDK();
        return sdk.auth.getPermissions(groupId);
    }

    /**
     * Append permissions to a group.
     * Valid scopes: 'self' | 'domain' | 'nil'
     *
     * @example
     * await groupService.addPermissions(groupId, [
     *   { name: 'collections', action: 'read-write', scope: 'domain' },
     *   { name: 'api_keys',    action: 'read-write', scope: 'self'   },
     * ]);
     */
    async addPermissions(groupId: string, permissions: Feature[]): Promise<void> {
        const sdk = await getOrInitializeSDK();
        await sdk.auth.addPermissionsToGroup(groupId, permissions);
    }

    /** Assign a user to a group. */
    async addUser(userId: string, groupId: string): Promise<void> {
        const sdk = await getOrInitializeSDK();
        await sdk.auth.addUserToGroup(userId, groupId);
    }
}

export const groupManagementService = new GroupManagementService();
