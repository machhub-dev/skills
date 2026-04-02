// filepath: src/guards/permission.guard.ts
import { authorizationService } from '../services/authorization.service';

export interface PermissionGuardOptions {
    feature: string;
    action: string;
    scope: string;
    redirectTo?: string;
}

/**
 * Returns true if the user has the required permission.
 * Optionally redirects if not allowed.
 */
export async function requirePermission(options: PermissionGuardOptions): Promise<boolean> {
    const { feature, action, scope, redirectTo } = options;

    const allowed = await authorizationService.canAccess(feature, action, scope);

    if (!allowed && redirectTo) {
        window.location.href = redirectTo;
    }

    return allowed;
}

/**
 * Gate a block of code behind a permission check.
 * Returns the result of `fn` if allowed, or `fallback` if not.
 */
export async function withPermission<T>(
    options: PermissionGuardOptions,
    fn: () => Promise<T> | T,
    fallback?: T
): Promise<T | undefined> {
    const allowed = await authorizationService.canAccess(
        options.feature,
        options.action,
        options.scope
    );
    if (!allowed) return fallback;
    return fn();
}
