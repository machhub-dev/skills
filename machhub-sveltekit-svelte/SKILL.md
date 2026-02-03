---
name: machhub-sveltekit-svelte
description: Complete guide for integrating MACHHUB SDK with Svelte 5 and SvelteKit, including runes, stores, load functions, and form actions.
related_skills: [machhub-sdk-initialization, machhub-sdk-architecture, machhub-sdk-collections, machhub-sdk-realtime]
---

## Overview

This skill covers **MACHHUB SDK integration with Svelte 5 and SvelteKit**, including runes ($state, $derived, $effect), stores, load functions, and SvelteKit-specific patterns.

**Use this skill when:**
- Building SvelteKit applications with MACHHUB
- Using Svelte 5 with MACHHUB SDK
- Implementing reactive state with runes
- Working with SvelteKit load functions and form actions
- Creating Svelte stores for MACHHUB data

**Prerequisites:**
- SvelteKit installed: `npm create svelte@latest my-machhub-app`
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
# Create SvelteKit app
npm create svelte@latest my-machhub-app
cd my-machhub-app

# Install MACHHUB SDK
npm install @machhub-dev/sdk-ts

# Install dependencies
npm install
```

---

## Initialization Method Priority

**⭐ RECOMMENDED: Zero-Configuration with Designer Extension**

For development in VSCode, use the **MACHHUB Designer Extension** for automatic zero-config initialization:

1. Install MACHHUB Designer Extension in VSCode
2. Use templates from `machhub-sveltekit-svelte/templates/sdk.service.ts` (zero-config)
3. SDK auto-configures - no manual setup needed!

**For Production: Manual Configuration**

When deploying to production, use manual configuration:
- See templates: `machhub-sveltekit-svelte/templates/sdk.service.manual.ts`
- Configure environment variables in `.env`
- See `machhub-sdk-initialization` for details

---

## SDK Service

```typescript
// src/lib/services/sdk.service.ts
import { SDK, type SDKConfig } from '@machhub-dev/sdk-ts';
import { browser } from '$app/environment';

class SDKService {
  private static instance: SDKService | null = null;
  private sdk: SDK | null = null;
  private isInitialized = false;
  private initPromise: Promise<boolean> | null = null;

  private constructor() {
    if (browser) {
      this.sdk = new SDK();
    }
  }

  public static getInstance(): SDKService {
    if (!SDKService.instance) {
      SDKService.instance = new SDKService();
    }
    return SDKService.instance;
  }

  public async initialize(config?: SDKConfig): Promise<boolean> {
    if (!browser) {
      console.warn('SDK requires browser environment');
      return false;
    }

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

        if (success) {
          console.log('MACHHUB SDK initialized');
        }

        return success;
      } catch (error) {
        console.error('SDK initialization error:', error);
        this.isInitialized = false;
        return false;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  public getSDK(): SDK {
    if (!this.isInitialized || !this.sdk) {
      throw new Error('SDK not initialized');
    }
    return this.sdk;
  }

  public async getOrInitializeSDK(config?: SDKConfig): Promise<SDK> {
    if (!this.isInitialized) {
      await this.initialize(config);
    }
    return this.getSDK();
  }

  public get initialized(): boolean {
    return this.isInitialized;
  }
}

export const sdkService = SDKService.getInstance();

export async function getOrInitializeSDK(config?: SDKConfig): Promise<SDK> {
  return sdkService.getOrInitializeSDK(config);
}
```

---

## Environment Configuration

```bash
# .env
PUBLIC_MACHHUB_APP_ID=your-app-id
PUBLIC_MACHHUB_HTTP_URL=http://localhost:80
PUBLIC_MACHHUB_MQTT_URL=mqtt://localhost:1883
```

```typescript
// src/lib/config.ts
import { PUBLIC_MACHHUB_APP_ID, PUBLIC_MACHHUB_HTTP_URL, PUBLIC_MACHHUB_MQTT_URL } from '$env/static/public';

export const machhubConfig = {
  application_id: PUBLIC_MACHHUB_APP_ID,
  httpUrl: PUBLIC_MACHHUB_HTTP_URL,
  mqttUrl: PUBLIC_MACHHUB_MQTT_URL
};
```

---

## Root Layout Initialization

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { getOrInitializeSDK } from '$lib/services/sdk.service';
  import { machhubConfig } from '$lib/config';

  let sdkReady = $state(false);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      await getOrInitializeSDK(machhubConfig);
      sdkReady = true;
    } catch (err: any) {
      error = err.message;
      console.error('Failed to initialize SDK:', err);
    }
  });
</script>

{#if error}
  <div class="error">
    SDK Initialization Error: {error}
  </div>
{:else if !sdkReady}
  <div class="loading">
    Initializing MACHHUB SDK...
  </div>
{:else}
  <slot />
{/if}
```

---

## Svelte 5 Runes with MACHHUB

### Product Service with Runes

```typescript
// src/lib/services/product.service.svelte.ts
import { sdkService } from './sdk.service';

export interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
}

export class ProductService {
  private collectionName = 'products';
  
  // Runes for reactive state
  products = $state<Product[]>([]);
  loading = $state(false);
  error = $state<Error | null>(null);

  // Derived state
  count = $derived(this.products.length);
  isEmpty = $derived(this.products.length === 0);

  async fetchAll() {
    this.loading = true;
    this.error = null;
    try {
      const sdk = sdkService.getSDK();
      const data = await sdk.collection(this.collectionName).getAll();
      this.products = data.map(this.transformProduct);
    } catch (err) {
      this.error = err as Error;
    } finally {
      this.loading = false;
    }
  }

  async fetchOne(id: string): Promise<Product | null> {
    try {
      const sdk = sdkService.getSDK();
      const data = await sdk.collection(this.collectionName)
        .getOne(`myapp.${this.collectionName}:${id}`);
      return data ? this.transformProduct(data) : null;
    } catch (err) {
      console.error('Error fetching product:', err);
      return null;
    }
  }

  async create(product: Omit<Product, 'id'>): Promise<Product> {
    try {
      const sdk = sdkService.getSDK();
      const created = await sdk.collection(this.collectionName).create(product);
      const transformed = this.transformProduct(created);
      this.products = [...this.products, transformed];
      return transformed;
    } catch (err) {
      this.error = err as Error;
      throw err;
    }
  }

  async update(id: string, updates: Partial<Product>): Promise<Product> {
    try {
      const sdk = sdkService.getSDK();
      const updated = await sdk.collection(this.collectionName)
        .update(`myapp.${this.collectionName}:${id}`, updates);
      const transformed = this.transformProduct(updated);
      
      this.products = this.products.map(p => 
        p.id === id ? transformed : p
      );
      
      return transformed;
    } catch (err) {
      this.error = err as Error;
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const sdk = sdkService.getSDK();
      await sdk.collection(this.collectionName)
        .delete(`myapp.${this.collectionName}:${id}`);
      this.products = this.products.filter(p => p.id !== id);
    } catch (err) {
      this.error = err as Error;
      throw err;
    }
  }

  private transformProduct(raw: any): Product {
    return {
      id: this.extractId(raw.id),
      name: raw.name,
      price: raw.price,
      description: raw.description
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

// Singleton instance
export const productService = new ProductService();
```

---

## Component with Runes

```svelte
<!-- src/routes/products/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { productService } from '$lib/services/product.service.svelte';

  let newProduct = $state({ name: '', price: 0 });

  onMount(() => {
    productService.fetchAll();
  });

  async function handleCreate() {
    try {
      await productService.create(newProduct);
      newProduct = { name: '', price: 0 };
    } catch (err) {
      console.error('Failed to create product:', err);
    }
  }

  async function handleDelete(id: string) {
    if (confirm('Are you sure?')) {
      await productService.remove(id);
    }
  }
</script>

<div class="container">
  <h1>Products ({productService.count})</h1>

  {#if productService.loading}
    <p class="loading">Loading products...</p>
  {:else if productService.error}
    <p class="error">Error: {productService.error.message}</p>
  {:else}
    <form onsubmit={handleCreate}>
      <input
        type="text"
        bind:value={newProduct.name}
        placeholder="Product name"
        required
      />
      <input
        type="number"
        bind:value={newProduct.price}
        placeholder="Price"
        required
      />
      <button type="submit">Add Product</button>
    </form>

    {#if productService.isEmpty}
      <p class="empty">No products yet.</p>
    {:else}
      <div class="products-grid">
        {#each productService.products as product (product.id)}
          <div class="product-card">
            <h3>{product.name}</h3>
            <p class="price">${product.price}</p>
            {#if product.description}
              <p class="description">{product.description}</p>
            {/if}
            <button onclick={() => handleDelete(product.id)}>
              Delete
            </button>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
```

---

## Real-time with $effect

```typescript
// src/lib/services/sensor.service.svelte.ts
import { sdkService } from './sdk.service';

export interface SensorData {
  value: number;
  timestamp: string;
  unit: string;
}

export class SensorService {
  data = $state<Map<string, SensorData>>(new Map());
  private activeSubscriptions: string[] = [];

  async subscribe(tags: string[]) {
    const sdk = sdkService.getSDK();

    for (const tag of tags) {
      await sdk.tag.subscribe(tag, (newData: SensorData, topic: string) => {
        this.data = new Map(this.data).set(topic, newData);
      });
      this.activeSubscriptions.push(tag);
    }
  }

  unsubscribe() {
    if (this.activeSubscriptions.length > 0) {
      const sdk = sdkService.getSDK();
      sdk.tag.unsubscribe(this.activeSubscriptions);
      this.activeSubscriptions = [];
    }
  }

  get(tag: string): SensorData | undefined {
    return this.data.get(tag);
  }
}

export const sensorService = new SensorService();
```

```svelte
<!-- src/routes/dashboard/+page.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { sensorService } from '$lib/services/sensor.service.svelte';

  const tags = ['temperature/room1', 'humidity/room1'];

  onMount(async () => {
    await sensorService.subscribe(tags);
  });

  onDestroy(() => {
    sensorService.unsubscribe();
  });

  // Reactive values using $derived
  let temperature = $derived(sensorService.get('temperature/room1'));
  let humidity = $derived(sensorService.get('humidity/room1'));
</script>

<div class="dashboard">
  <h1>Real-time Dashboard</h1>

  <div class="sensors">
    <div class="sensor-card">
      <h3>Temperature</h3>
      {#if temperature}
        <p class="value">{temperature.value}°C</p>
        <p class="timestamp">{new Date(temperature.timestamp).toLocaleTimeString()}</p>
      {:else}
        <p class="waiting">Waiting for data...</p>
      {/if}
    </div>

    <div class="sensor-card">
      <h3>Humidity</h3>
      {#if humidity}
        <p class="value">{humidity.value}%</p>
        <p class="timestamp">{new Date(humidity.timestamp).toLocaleTimeString()}</p>
      {:else}
        <p class="waiting">Waiting for data...</p>
      {/if}
    </div>
  </div>
</div>
```

---

## Writable Stores (Alternative)

```typescript
// src/lib/stores/products.ts
import { writable, derived, get } from 'svelte/store';
import { sdkService } from '$lib/services/sdk.service';

export interface Product {
  id: string;
  name: string;
  price: number;
}

function createProductStore() {
  const { subscribe, set, update } = writable<Product[]>([]);
  const loading = writable(false);
  const error = writable<Error | null>(null);

  return {
    subscribe,
    loading: { subscribe: loading.subscribe },
    error: { subscribe: error.subscribe },
    
    async fetchAll() {
      loading.set(true);
      error.set(null);
      try {
        const sdk = sdkService.getSDK();
        const data = await sdk.collection('products').getAll();
        set(data);
      } catch (err) {
        error.set(err as Error);
      } finally {
        loading.set(false);
      }
    },

    async create(product: Omit<Product, 'id'>) {
      const sdk = sdkService.getSDK();
      const created = await sdk.collection('products').create(product);
      update(products => [...products, created]);
      return created;
    },

    async remove(id: string) {
      const sdk = sdkService.getSDK();
      await sdk.collection('products').delete(`myapp.products:${id}`);
      update(products => products.filter(p => p.id !== id));
    }
  };
}

export const productStore = createProductStore();

// Derived stores
export const productCount = derived(productStore, $products => $products.length);
export const isEmpty = derived(productStore, $products => $products.length === 0);
```

```svelte
<!-- Usage with stores -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { productStore, productCount } from '$lib/stores/products';

  onMount(() => {
    productStore.fetchAll();
  });
</script>

<h1>Products ({$productCount})</h1>

{#if $productStore.loading}
  <p>Loading...</p>
{:else}
  {#each $productStore as product}
    <div>{product.name}</div>
  {/each}
{/if}
```

---

## SvelteKit Load Functions

```typescript
// src/routes/products/+page.ts
import type { PageLoad } from './$types';
import { sdkService } from '$lib/services/sdk.service';

export const load: PageLoad = async () => {
  try {
    const sdk = sdkService.getSDK();
    const products = await sdk.collection('products').getAll();
    
    return {
      products
    };
  } catch (error) {
    console.error('Error loading products:', error);
    return {
      products: []
    };
  }
};
```

```svelte
<!-- src/routes/products/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<h1>Products</h1>

{#each data.products as product}
  <div>{product.name} - ${product.price}</div>
{/each}
```

---

## Form Actions

```typescript
// src/routes/products/+page.server.ts
import type { Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const actions = {
  create: async ({ request }) => {
    const data = await request.formData();
    const name = data.get('name') as string;
    const price = Number(data.get('price'));

    if (!name || !price) {
      return fail(400, { name, price, missing: true });
    }

    try {
      // In server actions, you'd typically use API routes
      // since SDK is client-side only
      const response = await fetch('http://localhost:80/collections/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, price })
      });

      if (!response.ok) {
        return fail(500, { name, price, failed: true });
      }

      return { success: true };
    } catch (error) {
      return fail(500, { name, price, failed: true });
    }
  }
} satisfies Actions;
```

```svelte
<!-- src/routes/products/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
</script>

{#if form?.success}
  <p class="success">Product created successfully!</p>
{/if}

{#if form?.failed}
  <p class="error">Failed to create product</p>
{/if}

<form method="POST" action="?/create" use:enhance>
  <input type="text" name="name" placeholder="Product name" required />
  <input type="number" name="price" placeholder="Price" required />
  <button type="submit">Create Product</button>
</form>
```

---

## Authentication Guard (Hooks)

```typescript
// src/hooks.server.ts
import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const protectedRoutes = ['/dashboard', '/products'];
  const isProtected = protectedRoutes.some(route => 
    event.url.pathname.startsWith(route)
  );

  if (isProtected) {
    const authToken = event.cookies.get('auth-token');
    
    if (!authToken) {
      throw redirect(303, '/login');
    }
  }

  return resolve(event);
};
```

---

## Best Practices

1. ✅ **Browser check** - Always check `browser` before SDK operations
2. ✅ **Runes (.svelte.ts)** - Use Svelte 5 runes for reactive services
3. ✅ **Stores** - Alternative to runes for shared state
4. ✅ **Load functions** - Pre-fetch data for SSR/static generation
5. ✅ **Form actions** - Use server actions for mutations
6. ✅ **Environment variables** - Use PUBLIC_ prefix for client vars
7. ✅ **Cleanup** - Unsubscribe in `onDestroy`
8. ✅ **TypeScript** - Enable strict mode

---

## Svelte 5 + SvelteKit Checklist

- [ ] SDK service with browser check
- [ ] Environment variables with PUBLIC_ prefix
- [ ] Root layout initializes SDK
- [ ] Services use runes ($state, $derived) or stores
- [ ] Real-time subscriptions cleaned up in `onDestroy`
- [ ] Load functions for SSR data
- [ ] Form actions for server-side mutations
- [ ] Authentication guard in hooks
- [ ] TypeScript types defined for collections

---

## Resources

- **Svelte 5 Docs**: https://svelte-5-preview.vercel.app
- **SvelteKit Docs**: https://kit.svelte.dev
- **MACHHUB SDK**: See `machhub-sdk-initialization`
