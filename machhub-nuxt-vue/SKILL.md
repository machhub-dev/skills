---
name: machhub-nuxt-vue
description: Complete guide for integrating MACHHUB SDK with Nuxt 3 and Vue 3 applications, including composables, plugins, middleware, and Vue reactivity system.
related_skills: [machhub-sdk-initialization, machhub-sdk-architecture, machhub-sdk-collections, machhub-sdk-realtime]
---

## Overview

This skill covers **MACHHUB SDK integration with Nuxt 3 and Vue 3**, including composables, plugins, Vue reactivity, and Nuxt-specific patterns.

**Use this skill when:**
- Building Nuxt 3 applications with MACHHUB
- Using Vue 3 with MACHHUB SDK
- Creating composables for MACHHUB operations
- Working with Nuxt plugins and middleware
- Implementing reactive state with Vue

**Prerequisites:**
- Nuxt 3 installed: `npx nuxi@latest init my-machhub-app`
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
# Create Nuxt app
npx nuxi@latest init my-machhub-app
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
2. Use templates from `machhub-nuxt-vue/templates/sdk.client.ts` (zero-config)
3. SDK auto-configures - no manual setup needed!

**For Production: Manual Configuration**

When deploying to production, use manual configuration:
- See templates: `machhub-nuxt-vue/templates/sdk.client.manual.ts`
- Configure runtime config in `nuxt.config.ts`
- See `machhub-sdk-initialization` for details

---

## SDK Plugin

```typescript
// plugins/sdk.client.ts
import { SDK, type SDKConfig } from '@machhub-dev/sdk-ts';

class SDKService {
  private static instance: SDKService | null = null;
  private sdk: SDK | null = null;
  private isInitialized = false;
  private initPromise: Promise<boolean> | null = null;

  private constructor() {
    this.sdk = new SDK();
  }

  public static getInstance(): SDKService {
    if (!SDKService.instance) {
      SDKService.instance = new SDKService();
    }
    return SDKService.instance;
  }

  public async initialize(config?: SDKConfig): Promise<boolean> {
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

export default defineNuxtPlugin(async (nuxtApp) => {
  const config = useRuntimeConfig();
  
  const sdkService = SDKService.getInstance();
  
  await sdkService.initialize({
    application_id: config.public.machhubAppId,
    httpUrl: config.public.machhubHttpUrl,
    mqttUrl: config.public.machhubMqttUrl
  });

  return {
    provide: {
      sdk: sdkService.getSDK(),
      sdkService
    }
  };
});
```

---

## Runtime Config

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    // Server-side only
    machhubDeveloperKey: process.env.MACHHUB_DEVELOPER_KEY,
    
    // Public - exposed to client
    public: {
      machhubAppId: process.env.NUXT_PUBLIC_MACHHUB_APP_ID,
      machhubHttpUrl: process.env.NUXT_PUBLIC_MACHHUB_HTTP_URL,
      machhubMqttUrl: process.env.NUXT_PUBLIC_MACHHUB_MQTT_URL
    }
  }
});
```

```bash
# .env
NUXT_PUBLIC_MACHHUB_APP_ID=your-app-id
NUXT_PUBLIC_MACHHUB_HTTP_URL=http://localhost:80
NUXT_PUBLIC_MACHHUB_MQTT_URL=mqtt://localhost:1883
```

---

## Composables

### useSDK Composable

```typescript
// composables/useSDK.ts
import type { SDK } from '@machhub-dev/sdk-ts';

export const useSDK = () => {
  const { $sdk, $sdkService } = useNuxtApp();
  
  return {
    sdk: $sdk as SDK,
    sdkService: $sdkService,
    isInitialized: computed(() => $sdkService.initialized)
  };
};
```

### useCollection Composable

```typescript
// composables/useCollection.ts
import { ref, computed } from 'vue';
import type { Ref } from 'vue';

export function useCollection<T>(collectionName: string) {
  const { sdk } = useSDK();
  
  const data: Ref<T[]> = ref([]);
  const loading = ref(false);
  const error: Ref<Error | null> = ref(null);

  const count = computed(() => data.value.length);
  const isEmpty = computed(() => data.value.length === 0);

  const fetchAll = async () => {
    loading.value = true;
    error.value = null;
    try {
      const result = await sdk.collection(collectionName).getAll();
      data.value = result;
    } catch (err) {
      error.value = err as Error;
      console.error(`Error fetching ${collectionName}:`, err);
    } finally {
      loading.value = false;
    }
  };

  const fetchOne = async (id: string): Promise<T | null> => {
    try {
      const fullId = `myapp.${collectionName}:${id}`;
      return await sdk.collection(collectionName).getOne(fullId);
    } catch (err) {
      console.error(`Error fetching ${collectionName} ${id}:`, err);
      return null;
    }
  };

  const create = async (item: Omit<T, 'id'>): Promise<T> => {
    try {
      const created = await sdk.collection(collectionName).create(item);
      data.value.push(created);
      return created;
    } catch (err) {
      error.value = err as Error;
      throw err;
    }
  };

  const update = async (id: string, updates: Partial<T>): Promise<T> => {
    try {
      const fullId = `myapp.${collectionName}:${id}`;
      const updated = await sdk.collection(collectionName).update(fullId, updates);
      const index = data.value.findIndex((item: any) => item.id === id);
      if (index !== -1) {
        data.value[index] = updated;
      }
      return updated;
    } catch (err) {
      error.value = err as Error;
      throw err;
    }
  };

  const remove = async (id: string): Promise<void> => {
    try {
      const fullId = `myapp.${collectionName}:${id}`;
      await sdk.collection(collectionName).delete(fullId);
      data.value = data.value.filter((item: any) => item.id !== id);
    } catch (err) {
      error.value = err as Error;
      throw err;
    }
  };

  return {
    data: readonly(data),
    loading: readonly(loading),
    error: readonly(error),
    count,
    isEmpty,
    fetchAll,
    fetchOne,
    create,
    update,
    remove
  };
}
```

### useRealtimeTag Composable

```typescript
// composables/useRealtimeTag.ts
import { ref, onMounted, onUnmounted } from 'vue';
import type { Ref } from 'vue';

export function useRealtimeTag<T = any>(tagName: string) {
  const { sdk } = useSDK();
  
  const data: Ref<T | null> = ref(null);
  const lastUpdate: Ref<Date | null> = ref(null);
  const isSubscribed = ref(false);

  const subscribe = async () => {
    if (isSubscribed.value) return;

    try {
      await sdk.tag.subscribe(tagName, (newData: T) => {
        data.value = newData;
        lastUpdate.value = new Date();
      });
      isSubscribed.value = true;
    } catch (error) {
      console.error(`Error subscribing to ${tagName}:`, error);
    }
  };

  const unsubscribe = () => {
    if (!isSubscribed.value) return;
    sdk.tag.unsubscribe([tagName]);
    isSubscribed.value = false;
  };

  const publish = async (value: T) => {
    try {
      await sdk.tag.publish(tagName, value);
    } catch (error) {
      console.error(`Error publishing to ${tagName}:`, error);
      throw error;
    }
  };

  onMounted(() => {
    subscribe();
  });

  onUnmounted(() => {
    unsubscribe();
  });

  return {
    data: readonly(data),
    lastUpdate: readonly(lastUpdate),
    isSubscribed: readonly(isSubscribed),
    publish
  };
}
```

### useAuth Composable

```typescript
// composables/useAuth.ts
import { ref } from 'vue';

export function useAuth() {
  const { sdk } = useSDK();
  const router = useRouter();
  
  const user = ref<any>(null);
  const loading = ref(true);
  const isAuthenticated = computed(() => !!user.value);

  const checkAuth = async () => {
    try {
      loading.value = true;
      const currentUser = await sdk.auth.getCurrentUser();
      user.value = currentUser;
    } catch (err) {
      user.value = null;
    } finally {
      loading.value = false;
    }
  };

  const login = async (username: string, password: string) => {
    try {
      await sdk.auth.login(username, password);
      await checkAuth();
      router.push('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await sdk.auth.logout();
      user.value = null;
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  onMounted(() => {
    checkAuth();
  });

  return {
    user: readonly(user),
    loading: readonly(loading),
    isAuthenticated,
    login,
    logout,
    checkAuth
  };
}
```

---

## Page Examples

### Products List Page

```vue
<!-- pages/products/index.vue -->
<script setup lang="ts">
interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
}

const { data: products, loading, error, fetchAll, create, remove } = useCollection<Product>('products');

const newProduct = ref({ name: '', price: 0 });

onMounted(() => {
  fetchAll();
});

const handleCreate = async () => {
  try {
    await create(newProduct.value);
    newProduct.value = { name: '', price: 0 };
  } catch (err) {
    console.error('Failed to create product:', err);
  }
};

const handleDelete = async (id: string) => {
  if (confirm('Are you sure?')) {
    await remove(id);
  }
};
</script>

<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Products</h1>

    <div v-if="loading" class="text-center">Loading...</div>
    <div v-else-if="error" class="text-red-500">Error: {{ error.message }}</div>

    <div v-else>
      <form @submit.prevent="handleCreate" class="mb-6 flex gap-2">
        <input
          v-model="newProduct.name"
          type="text"
          placeholder="Product name"
          class="border p-2 flex-1"
          required
        />
        <input
          v-model.number="newProduct.price"
          type="number"
          placeholder="Price"
          class="border p-2 w-32"
          required
        />
        <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded">
          Add Product
        </button>
      </form>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          v-for="product in products"
          :key="product.id"
          class="border p-4 rounded shadow"
        >
          <h3 class="font-bold">{{ product.name }}</h3>
          <p class="text-lg">${{ product.price }}</p>
          <p v-if="product.description" class="text-sm text-gray-600">
            {{ product.description }}
          </p>
          <button
            @click="handleDelete(product.id)"
            class="mt-2 bg-red-500 text-white px-3 py-1 rounded text-sm"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
```

### Real-time Dashboard Page

```vue
<!-- pages/dashboard.vue -->
<script setup lang="ts">
interface SensorData {
  value: number;
  timestamp: string;
  unit: string;
}

const temperature = useRealtimeTag<SensorData>('temperature/room1');
const humidity = useRealtimeTag<SensorData>('humidity/room1');
const pressure = useRealtimeTag<SensorData>('pressure/room1');
</script>

<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Real-time Dashboard</h1>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="border p-4 rounded shadow">
        <h3 class="font-bold text-lg mb-2">Temperature</h3>
        <div v-if="temperature.data">
          <p class="text-4xl font-bold">{{ temperature.data.value }}°C</p>
          <p class="text-sm text-gray-500 mt-2">
            Updated: {{ temperature.lastUpdate?.toLocaleTimeString() }}
          </p>
        </div>
        <p v-else class="text-gray-400">Waiting for data...</p>
      </div>

      <div class="border p-4 rounded shadow">
        <h3 class="font-bold text-lg mb-2">Humidity</h3>
        <div v-if="humidity.data">
          <p class="text-4xl font-bold">{{ humidity.data.value }}%</p>
          <p class="text-sm text-gray-500 mt-2">
            Updated: {{ humidity.lastUpdate?.toLocaleTimeString() }}
          </p>
        </div>
        <p v-else class="text-gray-400">Waiting for data...</p>
      </div>

      <div class="border p-4 rounded shadow">
        <h3 class="font-bold text-lg mb-2">Pressure</h3>
        <div v-if="pressure.data">
          <p class="text-4xl font-bold">{{ pressure.data.value }} hPa</p>
          <p class="text-sm text-gray-500 mt-2">
            Updated: {{ pressure.lastUpdate?.toLocaleTimeString() }}
          </p>
        </div>
        <p v-else class="text-gray-400">Waiting for data...</p>
      </div>
    </div>
  </div>
</template>
```

---

## Middleware for Protected Routes

```typescript
// middleware/auth.ts
export default defineNuxtRouteMiddleware(async (to, from) => {
  const { $sdk } = useNuxtApp();

  try {
    const { valid } = await $sdk.auth.validateCurrentUser();
    
    if (!valid && to.path !== '/login') {
      return navigateTo('/login');
    }
    
    if (valid && to.path === '/login') {
      return navigateTo('/dashboard');
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    if (to.path !== '/login') {
      return navigateTo('/login');
    }
  }
});
```

```vue
<!-- pages/dashboard.vue -->
<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
});
</script>

<template>
  <div>
    <h1>Protected Dashboard</h1>
  </div>
</template>
```

---

## State Management with Pinia

```typescript
// stores/products.ts
import { defineStore } from 'pinia';

export interface Product {
  id: string;
  name: string;
  price: number;
}

export const useProductStore = defineStore('products', () => {
  const { sdk } = useSDK();
  
  const products = ref<Product[]>([]);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  const fetchProducts = async () => {
    loading.value = true;
    error.value = null;
    try {
      const data = await sdk.collection('products').getAll();
      products.value = data;
    } catch (err) {
      error.value = err as Error;
    } finally {
      loading.value = false;
    }
  };

  const addProduct = async (product: Omit<Product, 'id'>) => {
    const created = await sdk.collection('products').create(product);
    products.value.push(created);
    return created;
  };

  const deleteProduct = async (id: string) => {
    await sdk.collection('products').delete(`myapp.products:${id}`);
    products.value = products.value.filter(p => p.id !== id);
  };

  return {
    products: readonly(products),
    loading: readonly(loading),
    error: readonly(error),
    fetchProducts,
    addProduct,
    deleteProduct
  };
});
```

```vue
<!-- pages/products/store-example.vue -->
<script setup lang="ts">
const productStore = useProductStore();

onMounted(() => {
  productStore.fetchProducts();
});
</script>

<template>
  <div>
    <h1>Products (Pinia Store)</h1>
    <div v-if="productStore.loading">Loading...</div>
    <div v-else>
      <div v-for="product in productStore.products" :key="product.id">
        {{ product.name }} - ${{ product.price }}
      </div>
    </div>
  </div>
</template>
```

---

## Auto-imports Configuration

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  imports: {
    dirs: [
      'composables/**',
      'stores/**'
    ]
  },
  modules: ['@pinia/nuxt']
});
```

---

## Best Practices

1. ✅ **Client-only plugin** - Use `.client.ts` suffix for SDK plugin
2. ✅ **Composables** - Create reusable composables for common patterns
3. ✅ **Auto-imports** - Leverage Nuxt auto-imports
4. ✅ **Runtime config** - Use `useRuntimeConfig()` for environment variables
5. ✅ **Middleware** - Protect routes with authentication middleware
6. ✅ **Pinia stores** - Use Pinia for global state management
7. ✅ **TypeScript** - Enable strict mode for type safety
8. ✅ **Cleanup** - Unsubscribe in `onUnmounted` hooks

---

## Nuxt + Vue Checklist

- [ ] SDK plugin created with `.client.ts` suffix
- [ ] Runtime config set up with public variables
- [ ] Composables created for common operations
- [ ] Auto-imports configured for composables
- [ ] Middleware implemented for protected routes
- [ ] Real-time subscriptions cleaned up in `onUnmounted`
- [ ] Pinia store (optional) for global state
- [ ] TypeScript types defined for collections
- [ ] Error handling in composables

---

## Resources

- **Nuxt 3 Docs**: https://nuxt.com
- **Vue 3 Docs**: https://vuejs.org
- **Pinia Docs**: https://pinia.vuejs.org
- **MACHHUB SDK**: See `machhub-sdk-initialization`
