# MACHHUB Angular Templates

Copy-paste ready templates for integrating MACHHUB SDK with Angular applications.

## Quick Start

**Default: Zero Configuration (Recommended for Development)**

The templates use MACHHUB Designer Extension by default - no configuration needed!

1. Install MACHHUB Designer Extension in VSCode
2. Copy templates to your project
3. Start coding immediately

## Templates

### 1. `sdk.service.ts` ⭐ **Recommended**
**Zero-config SDK service using Designer Extension**
- No configuration required
- Perfect for development
- Automatic setup via extension
- Use this unless you need manual configuration

### 2. `sdk.service.manual.ts`
**Production SDK service with manual configuration**
- For production deployments
- Requires environment configuration
- Use when Designer Extension is not available

### 3. `app.config.ts`
**Application configuration with SDK initialization**
- APP_INITIALIZER setup
- Ensures SDK is ready before app starts
- Works with both zero-config and manual modes

### 4. `product.service.ts`
**Example domain service with Angular Signals**
- Full CRUD operations
- Signal-based state management
- Dependency injection
- Error handling

### 5. `auth.guard.ts`
**Route guards for authentication**
- Auth guard for protected routes
- Permission guard factory
- Router integration
- Functional guard pattern

## Usage

### Quick Setup (Zero-Config) ⭐

```typescript
// 1. Copy sdk.service.ts to src/app/services/
// 2. Copy app.config.ts to src/app/
// 3. That's it! SDK auto-configures via Designer Extension

// Use in any service:
import { Injectable } from '@angular/core';
import { SDKService } from './services/sdk.service';

@Injectable({ providedIn: 'root' })
export class MyService {
  constructor(private sdkService: SDKService) {}

  async loadData() {
    const sdk = this.sdkService.getSDK();
    const items = await sdk.collection('items').getAll();
    return items;
  }
}
```

### Production Setup (Manual Config)

```typescript
// 1. Copy sdk.service.manual.ts as sdk.service.ts
// 2. Configure environment.ts:

export const environment = {
  production: true,
  machhub: {
    application_id: 'your-app-id',
    httpUrl: 'https://your-server.com:80',
    mqttUrl: 'wss://your-server.com:1884',
    natsUrl: 'wss://your-server.com:9223'
  }
};
```

### Protected Routes

```typescript
// app.routes.ts
import { Routes } from '@angular/router';
import { authGuard, permissionGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'dashboard',
    canActivate: [authGuard],
    component: DashboardComponent
  },
  {
    path: 'admin',
    canActivate: [permissionGuard('admin.access')],
    component: AdminComponent
  }
];
```

### Using Signals with MACHHUB

```typescript
import { Component, OnInit } from '@angular/core';
import { ProductService } from './services/product.service';

@Component({
  selector: 'app-products',
  template: `
    <div *ngIf="productService.loading()">Loading...</div>
    <div *ngFor="let product of productService.products()">
      {{ product.name }} - {{ product.price }}
    </div>
  `
})
export class ProductsComponent implements OnInit {
  constructor(public productService: ProductService) {}

  ngOnInit() {
    this.productService.getAll();
  }
}
```

## When to Use What

### Use Zero-Config (`sdk.service.ts`) When:
- ✅ Local development
- ✅ Prototyping
- ✅ VSCode with Designer Extension
- ✅ Want fastest setup

### Use Manual Config (`sdk.service.manual.ts`) When:
- ✅ Production deployment
- ✅ CI/CD pipelines
- ✅ Multiple environments
- ✅ Designer Extension not available

## See Also

- [machhub-sdk-initialization](../machhub-sdk-initialization/) - General SDK setup
- [machhub-sdk-architecture](../machhub-sdk-architecture/) - Service patterns
- [machhub-sdk-authentication](../machhub-sdk-authentication/) - Auth details
