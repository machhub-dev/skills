# MACHHUB SvelteKit + Svelte 5 Templates

Copy-paste ready templates for integrating MACHHUB SDK with SvelteKit and Svelte 5 using modern runes.

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
- Singleton pattern with lazy initialization

### 2. `sdk.service.manual.ts`
**Production SDK service with manual configuration**
- For production deployments
- Uses SvelteKit environment variables
- Reads from $env/static/public

### 3. `layout.load.ts`
**Root layout load function**
- Initializes SDK before app renders
- Client-side only (ssr: false)
- Error handling

### 4. `collection.store.svelte.ts`
**Factory for creating collection stores with Svelte 5 runes**
- Full CRUD operations
- Uses `$state` and `$derived` runes
- Loading and error states
- Type-safe with generics

### 5. `auth.store.svelte.ts`
**Authentication store with Svelte 5 runes**
- Login/logout functionality
- Current user state
- Permission checking
- Uses `$state` and `$derived`

### 6. `products.page.svelte`
**Example page component**
- Uses collection store
- Full CRUD UI example
- Loading and error states
- Svelte 5 syntax

## Usage

### Quick Setup (Zero-Config) ⭐

```typescript
// 1. Copy sdk.service.ts to src/lib/
// 2. Copy layout.load.ts to src/routes/+layout.ts
// 3. That's it! SDK auto-configures via Designer Extension

// Use in any component:
<script lang="ts">
  import { getSDK } from '$lib/sdk.service';

  async function loadData() {
    const sdk = getSDK();
    const items = await sdk.collection('items').getAll();
    return items;
  }
</script>
```

### Production Setup (Manual Config)

```typescript
// 1. Copy sdk.service.manual.ts as sdk.service.ts
// 2. Create .env:

PUBLIC_MACHHUB_APP_ID=your-app-id
PUBLIC_MACHHUB_HTTP_URL=https://your-server.com:80
PUBLIC_MACHHUB_MQTT_URL=wss://your-server.com:1884
PUBLIC_MACHHUB_NATS_URL=wss://your-server.com:9223
```

### Using Collection Stores (Svelte 5 Runes)

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { createCollectionStore } from '$lib/stores/collection.svelte';

  interface Product {
    id: string;
    name: string;
    price: number;
  }

  const store = createCollectionStore<Product>('products');

  onMount(() => {
    store.getAll();
  });

  async function addProduct() {
    await store.create({ name: 'New Product', price: 99.99 });
  }
</script>

<div>
  {#if store.loading}
    <div>Loading...</div>
  {:else}
    {#each store.items as product (product.id)}
      <div>{product.name} - ${product.price}</div>
    {/each}
  {/if}
  
  <button onclick={addProduct}>Add Product</button>
</div>
```

### Authentication with Runes

```svelte
<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte';
  import { onMount } from 'svelte';

  let username = $state('');
  let password = $state('');

  onMount(() => {
    authStore.checkAuth();
  });

  async function handleLogin() {
    try {
      await authStore.login(username, password);
    } catch (error) {
      console.error('Login failed:', error);
    }
  }
</script>

<div>
  {#if authStore.isAuthenticated}
    <p>Welcome, {authStore.user?.username}!</p>
    <button onclick={() => authStore.logout()}>Logout</button>
  {:else}
    <form onsubmit={handleLogin}>
      <input bind:value={username} placeholder="Username" />
      <input bind:value={password} type="password" placeholder="Password" />
      <button type="submit">Login</button>
    </form>
  {/if}
</div>
```

### Protected Routes

```typescript
// src/routes/dashboard/+page.ts
import { authStore } from '$lib/stores/auth.svelte';
import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
  await authStore.checkAuth();
  
  if (!authStore.isAuthenticated) {
    throw redirect(307, '/login');
  }
  
  return {};
};
```

### Direct SDK Access

```svelte
<script lang="ts">
  import { getSDK } from '$lib/sdk.service';
  
  async function fetchData() {
    const sdk = getSDK();
    
    // Collections
    const products = await sdk.collection('products').getAll();
    
    // Real-time
    const tagService = sdk.tagging('sensor-data');
    tagService.subscribe((data) => {
      console.log('New data:', data);
    });
    
    // Authentication
    const user = await sdk.auth.getCurrentUser();
  }
</script>
```

## Svelte 5 Runes Guide

### $state - Reactive State

```typescript
let count = $state(0);
let user = $state<User | null>(null);
let items = $state<Product[]>([]);
```

### $derived - Computed Values

```typescript
let count = $state(0);
let doubled = $derived(count * 2);

let user = $state<User | null>(null);
let isAuthenticated = $derived(user !== null);
```

### Getters for Store State

```typescript
return {
  get items() {
    return items; // Returns reactive $state
  },
  get loading() {
    return loading;
  }
};
```

## Important Notes

### Client-Side Only

MACHHUB SDK runs client-side only:

```typescript
// +layout.ts
export const ssr = false; // Required!
export const prerender = false;

export const load = async () => {
  if (browser) {
    await initializeSDK();
  }
  return {};
};
```

### SvelteKit Routing

```
src/
  routes/
    +layout.ts          # Initialize SDK here
    +page.svelte        # Home page
    products/
      +page.svelte      # Products page
      +page.ts          # Optional load function
    dashboard/
      +page.svelte      # Protected page
      +page.ts          # Auth check here
```

### Store Patterns

```typescript
// Factory pattern (multiple instances)
const productsStore = createCollectionStore<Product>('products');
const ordersStore = createCollectionStore<Order>('orders');

// Singleton pattern (shared instance)
export const authStore = createAuthStore();
```

## When to Use What

### Use Zero-Config (`sdk.service.ts`) When:
- ✅ Local development
- ✅ Prototyping
- ✅ VSCode with Designer Extension
- ✅ Want fastest setup

### Use Manual Config (`sdk.service.manual.ts`) When:
- ✅ Production deployment
- ✅ Vercel/Netlify/Adapter deployments
- ✅ Multiple environments
- ✅ CI/CD pipelines

## See Also

- [machhub-sdk-initialization](../machhub-sdk-initialization/) - General SDK setup
- [machhub-sdk-architecture](../machhub-sdk-architecture/) - Service patterns
- [machhub-sdk-authentication](../machhub-sdk-authentication/) - Auth details
