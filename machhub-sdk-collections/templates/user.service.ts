// filepath: src/services/user.service.ts
import { getOrInitializeSDK } from './sdk.service';
import type { SDK } from '@machhub-dev/sdk-ts';

export interface User {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    role: 'admin' | 'user' | 'guest';
    isActive: boolean;
    profilePicture?: string;
    createdAt: Date;
    updatedAt: Date;
}

class UserService {
    private collectionName = 'users';
    private sdk: SDK | null = null;

    private async getSDK(): Promise<SDK> {
        if (!this.sdk) {
            this.sdk = await getOrInitializeSDK();
        }
        return this.sdk;
    }

    /**
     * Get all users with optional filters
     */
    async getAllUsers(filters?: {
        role?: User['role'];
        isActive?: boolean;
        page?: number;
        limit?: number;
    }): Promise<User[]> {
        try {
            const sdk = await this.getSDK();
            let query = sdk.collection(this.collectionName);

            if (filters?.role) {
                query = query.filter('role', 'eq', filters.role);
            }

            if (filters?.isActive !== undefined) {
                query = query.filter('isActive', 'eq', filters.isActive);
            }

            if (filters?.page && filters?.limit) {
                const skip = (filters.page - 1) * filters.limit;
                query = query.skip(skip).limit(filters.limit);
            }

            const users = await query.getAll();
            return users.map(this.transformUser);
        } catch (error) {
            console.error('Error fetching users:', error);
            throw new Error('Failed to fetch users');
        }
    }

    /**
     * Get user by ID
     */
    async getUserById(id: string): Promise<User | null> {
        try {
            const sdk = await this.getSDK();
            const fullId = `myapp.${this.collectionName}:${id}`;
            const user = await sdk.collection(this.collectionName).getOne(fullId);
            return user ? this.transformUser(user) : null;
        } catch (error) {
            console.error(`Error fetching user ${id}:`, error);
            return null;
        }
    }

    /**
     * Get user by email
     */
    async getUserByEmail(email: string): Promise<User | null> {
        try {
            const sdk = await this.getSDK();
            const users = await sdk
                .collection(this.collectionName)
                .filter('email', 'eq', email)
                .getAll();

            return users.length > 0 ? this.transformUser(users[0]) : null;
        } catch (error) {
            console.error(`Error fetching user by email ${email}:`, error);
            return null;
        }
    }

    /**
     * Create new user
     */
    async createUser(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
        try {
            // Validation
            if (!data.email || !this.isValidEmail(data.email)) {
                throw new Error('Invalid email address');
            }

            // Check if email already exists
            const existing = await this.getUserByEmail(data.email);
            if (existing) {
                throw new Error('Email already exists');
            }

            const sdk = await this.getSDK();
            const created = await sdk.collection(this.collectionName).create(data);
            return this.transformUser(created);
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    /**
     * Update user
     */
    async updateUser(
        id: string,
        updates: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>
    ): Promise<User> {
        try {
            // Validate email if provided
            if (updates.email && !this.isValidEmail(updates.email)) {
                throw new Error('Invalid email address');
            }

            const sdk = await this.getSDK();
            const fullId = `myapp.${this.collectionName}:${id}`;
            const updated = await sdk.collection(this.collectionName).update(fullId, updates);
            return this.transformUser(updated);
        } catch (error) {
            console.error(`Error updating user ${id}:`, error);
            throw error;
        }
    }

    /**
     * Delete user
     */
    async deleteUser(id: string): Promise<void> {
        try {
            const sdk = await this.getSDK();
            const fullId = `myapp.${this.collectionName}:${id}`;
            await sdk.collection(this.collectionName).delete(fullId);
        } catch (error) {
            console.error(`Error deleting user ${id}:`, error);
            throw error;
        }
    }

    /**
     * Activate/deactivate user
     */
    async setUserActive(id: string, isActive: boolean): Promise<User> {
        return await this.updateUser(id, { isActive });
    }

    /**
     * Get users by role
     */
    async getUsersByRole(role: User['role']): Promise<User[]> {
        return await this.getAllUsers({ role });
    }

    /**
     * Search users by name
     */
    async searchUsers(query: string): Promise<User[]> {
        try {
            const sdk = await this.getSDK();
            const users = await sdk
                .collection(this.collectionName)
                .filter('firstName', 'contains', query)
                .or()
                .filter('lastName', 'contains', query)
                .or()
                .filter('username', 'contains', query)
                .getAll();

            return users.map(this.transformUser);
        } catch (error) {
            console.error('Error searching users:', error);
            throw new Error('Failed to search users');
        }
    }

    /**
     * Email validation helper
     */
    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Extract ID from RecordID format
     */
    private extractId(value: any): string {
        if (typeof value === 'object' && value?.ID) {
            return value.ID;
        }
        if (typeof value === 'string' && value.includes(':')) {
            return value.split(':')[1];
        }
        return value;
    }

    /**
     * Transform user from API format to app format
     */
    private transformUser = (raw: any): User => {
        return {
            id: this.extractId(raw.id),
            email: raw.email,
            username: raw.username,
            firstName: raw.firstName,
            lastName: raw.lastName,
            role: raw.role,
            isActive: raw.isActive,
            profilePicture: raw.profilePicture,
            createdAt: new Date(raw.createdAt),
            updatedAt: new Date(raw.updatedAt)
        };
    };
}

export const userService = new UserService();
