// filepath: src/app/app.config.ts
import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { SDKService } from './services/sdk.service';

/**
 * SDK Initialization Factory
 * Initializes MACHHUB SDK before app bootstrap using Designer Extension (zero-config)
 */
export function initializeSDK(sdkService: SDKService) {
    return () => sdkService.initialize();
}

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(routes),
        {
            provide: APP_INITIALIZER,
            useFactory: initializeSDK,
            deps: [SDKService],
            multi: true
        }
    ]
};
