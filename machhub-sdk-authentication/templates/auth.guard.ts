// filepath: src/guards/auth.guard.ts
import { authService } from '../services/auth.service';

export interface GuardOptions {
    requireAuth?: boolean;
    requiredPermissions?: string[];
    requiredGroups?: string[];
    requireAll?: boolean; // If true, require ALL permissions/groups, else ANY
    redirectTo?: string;
}

export class AuthGuard {
    /**
     * Check if access is allowed
     */
    async canActivate(options: GuardOptions = {}): Promise<boolean> {
        const {
            requireAuth = true,
            requiredPermissions = [],
            requiredGroups = [],
            requireAll = false
        } = options;

        // Check authentication
        if (requireAuth) {
            const isAuthenticated = await authService.isAuthenticated();
            if (!isAuthenticated) {
                return false;
            }
        }

        // Check permissions
        if (requiredPermissions.length > 0) {
            const hasPermission = requireAll
                ? await authService.hasAllPermissions(requiredPermissions)
                : await authService.hasAnyPermission(requiredPermissions);

            if (!hasPermission) {
                return false;
            }
        }

        // Check groups
        if (requiredGroups.length > 0) {
            if (requireAll) {
                for (const group of requiredGroups) {
                    if (!(await authService.isInGroup(group))) {
                        return false;
                    }
                }
            } else {
                let hasGroup = false;
                for (const group of requiredGroups) {
                    if (await authService.isInGroup(group)) {
                        hasGroup = true;
                        break;
                    }
                }
                if (!hasGroup) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Create a guard function for a specific route
     */
    static create(options: GuardOptions) {
        const guard = new AuthGuard();
        return async () => guard.canActivate(options);
    }
}

// Predefined guards
export const requireAuth = AuthGuard.create({ requireAuth: true });

export const requireAdmin = AuthGuard.create({
    requireAuth: true,
    requiredGroups: ['admin']
});

export const requirePermission = (permission: string) =>
    AuthGuard.create({
        requireAuth: true,
        requiredPermissions: [permission]
    });
