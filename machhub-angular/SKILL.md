---
name: machhub-angular
description: Complete guide for integrating MACHHUB SDK with Angular applications, including services, dependency injection, RxJS patterns, and lifecycle hooks.
related_skills: [machhub-sdk-initialization, machhub-sdk-architecture, machhub-sdk-collections, machhub-sdk-realtime]
---

## Overview

This skill covers **MACHHUB SDK integration with Angular**, including services, dependency injection, RxJS observables, and Angular-specific patterns.

**Use this skill when:**
- Building Angular applications with MACHHUB
- Setting up MACHHUB SDK in Angular projects
- Implementing reactive patterns with RxJS
- Using Angular services and dependency injection
- Working with Angular lifecycle hooks

**Prerequisites:**
- Angular CLI installed: `npm install -g @angular/cli`
- MACHHUB SDK installed: `npm install @machhub-dev/sdk-ts`
- **MACHHUB Designer Extension (VSCode)** - Zero-config initialization (RECOMMENDED)
- Understanding of `machhub-sdk-initialization` for manual config (production)

**Related Skills:****
- `machhub-sdk-initialization` - Core SDK setup
- `machhub-sdk-architecture` - Service patterns
- `machhub-sdk-collections` - CRUD operations
- `machhub-sdk-realtime` - Real-time subscriptions

---

## Installation

```bash
# Create Angular app
ng new my-machhub-app
cd my-machhub-app

# Install MACHHUB SDK
npm install @machhub-dev/sdk-ts

# Install RxJS (if not already included)
npm install rxjs
```

---

## Initialization Method Priority

**⭐ RECOMMENDED: Zero-Configuration with Designer Extension**

For development in VSCode, use the **MACHHUB Designer Extension** for automatic zero-config initialization:

1. Install MACHHUB Designer Extension in VSCode
2. Use templates from `machhub-angular/templates/sdk.service.ts` (zero-config)
3. SDK auto-configures - no manual setup needed!

**For Production: Manual Configuration**

When deploying to production, use manual configuration:
- See templates: `machhub-angular/templates/sdk.service.manual.ts`
- Configure environment variables
- See `machhub-sdk-initialization` for details

---

## SDK Service (Angular Injectable)

```typescript
// src/app/services/sdk.service.ts
import { Injectable } from '@angular/core';
import { SDK, type SDKConfig } from '@machhub-dev/sdk-ts';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root' // Singleton service
})
export class SdkService {
  private sdk: SDK | null = null;
  private isInitialized = false;
  private initPromise: Promise<boolean> | null = null;

  // Observable for initialization state
  private initializedSubject = new BehaviorSubject<boolean>(false);
  public initialized$ = this.initializedSubject.asObservable();

  constructor() {
    this.sdk = new SDK();
  }

  /**
   * Initialize SDK with configuration
   */
  async initialize(config?: SDKConfig): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        if (!this.sdk) {
          this.sdk = new SDK();
        }

        const success = await this.sdk.Initialize(config);
        this.isInitialized = success;
        this.initializedSubject.next(success);

        if (success) {
          console.log('MACHHUB SDK initialized successfully');
        }

        return success;
      } catch (error) {
        console.error('Error initializing SDK:', error);
        this.isInitialized = false;
        this.initializedSubject.next(false);
        return false;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  /**
   * Get SDK instance
   */
  getSDK(): SDK {
    if (!this.isInitialized || !this.sdk) {
      throw new Error('SDK not initialized. Call initialize() first.');
    }
    return this.sdk;
  }

  /**
   * Get or initialize SDK
   */
  async getOrInitializeSDK(config?: SDKConfig): Promise<SDK> {
    if (!this.isInitialized) {
      await this.initialize(config);
    }
    return this.getSDK();
  }
}
```

---

## App Initialization (APP_INITIALIZER)

```typescript
// src/app/app.config.ts (Angular 17+ standalone)
import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { SdkService } from './services/sdk.service';
import { environment } from '../environments/environment';

function initializeApp(sdkService: SdkService) {
  return () => sdkService.initialize({
    application_id: environment.machhubAppId,
    httpUrl: environment.machhubHttpUrl,
    mqttUrl: environment.machhubMqttUrl
  });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [SdkService],
      multi: true
    }
  ]
};
```

### For NgModule-based Apps

```typescript
// src/app/app.module.ts
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { SdkService } from './services/sdk.service';
import { environment } from '../environments/environment';

export function initializeApp(sdkService: SdkService) {
  return () => sdkService.initialize({
    application_id: environment.machhubAppId,
    httpUrl: environment.machhubHttpUrl
  });
}

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [SdkService],
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
```

---

## Environment Configuration

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  machhubAppId: 'your-app-id',
  machhubHttpUrl: 'http://localhost:80',
  machhubMqttUrl: 'mqtt://localhost:1883'
};

// src/environments/environment.prod.ts
export const environment = {
  production: true,
  machhubAppId: 'your-production-app-id',
  machhubHttpUrl: 'https://api.machhub.io',
  machhubMqttUrl: 'mqtts://mqtt.machhub.io'
};
```

---

## Domain Service with RxJS

```typescript
// src/app/services/product.service.ts
import { Injectable } from '@angular/core';
import { Observable, from, BehaviorSubject, map, catchError, of } from 'rxjs';
import { SdkService } from './sdk.service';
import { RecordIDToString, StringToRecordID } from '@machhub-dev/sdk-ts';

export interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  categoryId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private collectionName = 'products';
  private productsSubject = new BehaviorSubject<Product[]>([]);
  public products$ = this.productsSubject.asObservable();

  constructor(private sdkService: SdkService) {}

  /**
   * Get all products as Observable
   */
  getAllProducts(): Observable<Product[]> {
    return from(
      this.sdkService.getSDK()
        .collection(this.collectionName)
        .getAll()
    ).pipe(
      map(products => products.map(this.transformProduct)),
      catchError(error => {
        console.error('Error fetching products:', error);
        return of([]);
      })
    );
  }

  /**
   * Get product by ID as Observable
   */
  getProductById(id: string): Observable<Product | null> {
    return from(
      this.sdkService.getSDK()
        .collection(this.collectionName)
        .getOne(`myapp.${this.collectionName}:${id}`)
    ).pipe(
      map(product => product ? this.transformProduct(product) : null),
      catchError(error => {
        console.error('Error fetching product:', error);
        return of(null);
      })
    );
  }

  /**
   * Create product
   */
  createProduct(product: Omit<Product, 'id'>): Observable<Product> {
    return from(
      this.sdkService.getSDK()
        .collection(this.collectionName)
        .create(product)
    ).pipe(
      map(created => this.transformProduct(created)),
      catchError(error => {
        console.error('Error creating product:', error);
        throw error;
      })
    );
  }

  /**
   * Update product
   */
  updateProduct(id: string, updates: Partial<Product>): Observable<Product> {
    return from(
      this.sdkService.getSDK()
        .collection(this.collectionName)
        .update(`myapp.${this.collectionName}:${id}`, updates)
    ).pipe(
      map(updated => this.transformProduct(updated)),
      catchError(error => {
        console.error('Error updating product:', error);
        throw error;
      })
    );
  }

  /**
   * Delete product
   */
  deleteProduct(id: string): Observable<boolean> {
    return from(
      this.sdkService.getSDK()
        .collection(this.collectionName)
        .delete(`myapp.${this.collectionName}:${id}`)
    ).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error deleting product:', error);
        return of(false);
      })
    );
  }

  /**
   * Load and cache products
   */
  async loadProducts(): Promise<void> {
    try {
      const products = await this.sdkService.getSDK()
        .collection(this.collectionName)
        .getAll();
      
      this.productsSubject.next(products.map(this.transformProduct));
    } catch (error) {
      console.error('Error loading products:', error);
      this.productsSubject.next([]);
    }
  }

  private transformProduct(raw: any): Product {
    return {
      id: this.extractId(raw.id),
      name: raw.name,
      price: raw.price,
      description: raw.description,
      categoryId: raw.categoryId ? this.extractId(raw.categoryId) : undefined
    };
  }

  private extractId(value: any): string {
    if (typeof value === 'object' && value?.ID) {
      return value.ID;
    }
    if (typeof value === 'string' && value.includes(':')) {
      return value.split(':')[1];
    }
    return value;
  }
}
```

---

## Component Usage

```typescript
// src/app/components/product-list/product-list.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService, Product } from '../../services/product.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css']
})
export class ProductListComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  loading = true;
  error: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    // Subscribe to products observable
    this.productService.products$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.products = products;
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Failed to load products';
          this.loading = false;
          console.error(err);
        }
      });

    // Load products
    this.productService.loadProducts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async deleteProduct(id: string): Promise<void> {
    if (confirm('Are you sure?')) {
      this.productService.deleteProduct(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (success) => {
            if (success) {
              this.productService.loadProducts(); // Reload
            }
          },
          error: (err) => console.error('Delete failed:', err)
        });
    }
  }
}
```

```html
<!-- src/app/components/product-list/product-list.component.html -->
<div class="product-list">
  <h2>Products</h2>

  <div *ngIf="loading" class="loading">Loading...</div>
  <div *ngIf="error" class="error">{{ error }}</div>

  <div *ngIf="!loading && !error" class="products">
    <div *ngFor="let product of products" class="product-card">
      <h3>{{ product.name }}</h3>
      <p class="price">{{ product.price | currency }}</p>
      <p *ngIf="product.description">{{ product.description }}</p>
      <button (click)="deleteProduct(product.id)" class="btn-delete">
        Delete
      </button>
    </div>
  </div>
</div>
```

---

## Real-time Subscriptions with RxJS

```typescript
// src/app/services/sensor.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SdkService } from './sdk.service';

export interface SensorData {
  value: number;
  timestamp: string;
  quality: string;
}

@Injectable({
  providedIn: 'root'
})
export class SensorService implements OnDestroy {
  private sensorDataSubject = new BehaviorSubject<Map<string, SensorData>>(new Map());
  public sensorData$ = this.sensorDataSubject.asObservable();
  private activeSubscriptions: string[] = [];

  constructor(private sdkService: SdkService) {}

  /**
   * Subscribe to sensor tags
   */
  async subscribeSensors(tags: string[]): Promise<void> {
    const sdk = this.sdkService.getSDK();

    for (const tag of tags) {
      await sdk.tag.subscribe(tag, (data: SensorData, topic: string) => {
        const currentData = this.sensorDataSubject.value;
        currentData.set(topic, data);
        this.sensorDataSubject.next(new Map(currentData));
      });

      this.activeSubscriptions.push(tag);
    }
  }

  /**
   * Get sensor data for specific tag
   */
  getSensorData(tag: string): Observable<SensorData | undefined> {
    return new Observable(observer => {
      const subscription = this.sensorData$.subscribe(dataMap => {
        observer.next(dataMap.get(tag));
      });
      return () => subscription.unsubscribe();
    });
  }

  /**
   * Unsubscribe from all sensors
   */
  ngOnDestroy(): void {
    if (this.activeSubscriptions.length > 0) {
      const sdk = this.sdkService.getSDK();
      sdk.tag.unsubscribe(this.activeSubscriptions);
      this.activeSubscriptions = [];
    }
  }
}
```

---

## Guards for Protected Routes

```typescript
// src/app/guards/auth.guard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SdkService } from '../services/sdk.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const sdkService = inject(SdkService);
  const router = inject(Router);

  try {
    const sdk = sdkService.getSDK();
    const { valid } = await sdk.auth.validateCurrentUser();

    if (!valid) {
      router.navigate(['/login']);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Auth guard error:', error);
    router.navigate(['/login']);
    return false;
  }
};

// Usage in routes
// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: '/login' }
];
```

---

## Signals (Angular 16+)

```typescript
// src/app/services/product-signals.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { SdkService } from './sdk.service';

@Injectable({
  providedIn: 'root'
})
export class ProductSignalsService {
  private collectionName = 'products';
  
  // Signals
  products = signal<Product[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  // Computed signals
  productCount = computed(() => this.products().length);
  hasProducts = computed(() => this.products().length > 0);

  constructor(private sdkService: SdkService) {}

  async loadProducts(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const sdk = this.sdkService.getSDK();
      const data = await sdk.collection(this.collectionName).getAll();
      this.products.set(data);
    } catch (err: any) {
      this.error.set(err.message || 'Failed to load products');
    } finally {
      this.loading.set(false);
    }
  }
}

// Component using signals
@Component({
  selector: 'app-products',
  standalone: true,
  template: `
    <div>
      <h2>Products ({{ productService.productCount() }})</h2>
      @if (productService.loading()) {
        <p>Loading...</p>
      }
      @if (productService.error()) {
        <p class="error">{{ productService.error() }}</p>
      }
      @for (product of productService.products(); track product.id) {
        <div>{{ product.name }}</div>
      }
    </div>
  `
})
export class ProductsComponent {
  constructor(public productService: ProductSignalsService) {
    this.productService.loadProducts();
  }
}
```

---

## Best Practices

1. ✅ **Use APP_INITIALIZER** - Initialize SDK before app starts
2. ✅ **Injectable services** - Leverage Angular DI system
3. ✅ **RxJS Observables** - Convert Promises to Observables for reactive patterns
4. ✅ **takeUntil pattern** - Unsubscribe from observables in ngOnDestroy
5. ✅ **Route guards** - Protect routes with authentication
6. ✅ **Environment variables** - Store config in environment files
7. ✅ **Signals (Angular 16+)** - Use signals for reactive state
8. ✅ **Standalone components** - Use standalone API for modern Angular

---

## Angular Checklist

- [ ] SDK service created with `@Injectable({ providedIn: 'root' })`
- [ ] APP_INITIALIZER configured for SDK initialization
- [ ] Environment variables set up
- [ ] Domain services use RxJS observables
- [ ] Components use `takeUntil` for subscription cleanup
- [ ] Auth guard implemented for protected routes
- [ ] Real-time subscriptions cleaned up in `ngOnDestroy`
- [ ] Error handling implemented in services
- [ ] TypeScript strict mode enabled

---

## Resources

- **Angular Docs**: https://angular.dev
- **RxJS Docs**: https://rxjs.dev
- **MACHHUB SDK**: See `machhub-sdk-initialization`
