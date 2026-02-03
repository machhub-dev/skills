// filepath: src/app/guards/auth.guard.ts
import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { SDKService } from '../services/sdk.service';

/**
 * Authentication Guard
 * Protects routes that require authentication
 */
export const authGuard: CanActivateFn = async (route, state) => {
    const sdkService = inject(SDKService);
    const router = inject(Router);

    try {
        const sdk = sdkService.getSDK();
        const user = await sdk.auth.getCurrentUser();

        if (user) {
            return true;
        }

        router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
        return false;
    } catch (error) {
        console.error('Auth guard error:', error);
        router.navigate(['/login']);
        return false;
    }
};

/**
 * Permission Guard Factory
 * Create guards that check for specific permissions
 */
export function permissionGuard(permission: string): CanActivateFn {
    return async (route, state) => {
        const sdkService = inject(SDKService);
        const router = inject(Router);

        try {
            const sdk = sdkService.getSDK();
            const hasPermission = await sdk.auth.hasPermission(permission);

            if (hasPermission) {
                return true;
            }

            router.navigate(['/unauthorized']);
            return false;
        } catch (error) {
            console.error('Permission guard error:', error);
            router.navigate(['/login']);
            return false;
        }
    };
}
