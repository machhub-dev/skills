# MACHHUB Nuxt + Vue Templates

Copy-paste ready templates for integrating MACHHUB SDK with Nuxt 3 and Vue 3 applications.

## Quick Start

**Default: Zero Configuration (Recommended for Development)**

The templates use MACHHUB Designer Extension by default - no configuration needed!

1. Install MACHHUB Designer Extension in VSCode
2. Copy templates to your project
3. Start coding immediately

## Templates

### 1. `sdk.client.ts` ⭐ **Recommended**
**Zero-config SDK plugin using Designer Extension**
- No configuration required
- Perfect for development
- Automatic setup via extension
- Client-side only plugin

### 2. `sdk.client.manual.ts`
**Production SDK plugin with manual configuration**
- For production deployments
- Uses nuxt.config.ts runtime config
- Environment variable support

### 3. `use-collection.ts`
**Composable for collection CRUD operations**
- Full CRUD with Vue reactivity
- Ref-based state management
- Loading and error states
- Type-safe with generics

### 4. `use-auth.ts`
**Authentication composable**
- Login/logout functionality
- Current user state
- Permission checking
- Computed isAuthenticated

### 5. `auth.middleware.ts`
**Route middleware for authentication**
- Protects pages requiring login
- Redirect to login with return URL
- Uses useAuth composable

### 6. `products.vue`
**Example page component**
- Uses useCollection composable
- Full CRUD UI example
- Loading and error states
- Vue 3 Composition API

## Usage

### Quick Setup (Zero-Config) ⭐

```typescript
// 1. Copy sdk.client.ts to plugins/
// 2. That's it! SDK auto-configures via Designer Extension

// Use in any component:
<script setup lang="ts">
const { $sdk } = useNuxtApp();

async function loadData() {
  const items = await $sdk.collection('items').getAll();
  return items;
}
</script>
```

### Production Setup (Manual Config)

```typescript
// 1. Copy sdk.client.manual.ts as sdk.client.ts
// 2. Update nuxt.config.ts:

export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      machhub: {
        applicationId: process.env.NUXT_PUBLIC_MACHHUB_APP_ID,
        httpUrl: process.env.NUXT_PUBLIC_MACHHUB_HTTP_URL,
        mqttUrl: process.env.NUXT_PUBLIC_MACHHUB_MQTT_URL,
        natsUrl: process.env.NUXT_PUBLIC_MACHHUB_NATS_URL
      }
    }
  }
});

// 3. Create .env:
// NUXT_PUBLIC_MACHHUB_APP_ID=your-app-id
// NUXT_PUBLIC_MACHHUB_HTTP_URL=https://your-server.com:80
// NUXT_PUBLIC_MACHHUB_MQTT_URL=wss://your-server.com:1884
// NUXT_PUBLIC_MACHHUB_NATS_URL=wss://your-server.com:9223
```

### Using Composables

```vue
<script setup lang="ts">
interface Product {
  id: string;
  name: string;
  price: number;
}

const { items, loading, getAll, create } = useCollection<Product>('products');

onMounted(() => {
  getAll();
});

async function addProduct() {
  await create({ name: 'New Product', price: 99.99 });
}
</script>

<template>
  <div>
    <div v-if="loading">Loading...</div>
    <div v-else>
      <div v-for="product in items" :key="product.id">
        {{ product.name }} - ${{ product.price }}
      </div>
      <button @click="addProduct">Add Product</button>
    </div>
  </div>
</template>
```

### Protected Pages

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
    <p>Only authenticated users can see this</p>
  </div>
</template>
```

### Authentication

```vue
<script setup lang="ts">
const auth = useAuth();
const username = ref('');
const password = ref('');

async function handleLogin() {
  try {
    const success = await auth.login(username.value, password.value);
    if (success) {
      navigateTo('/dashboard');
    }
  } catch (error) {
    console.error('Login failed:', error);
  }
}
</script>

<template>
  <div>
    <h1>Login</h1>
    <div v-if="auth.isAuthenticated.value">
      <p>Logged in as {{ auth.user.value?.username }}</p>
      <button @click="auth.logout()">Logout</button>
    </div>
    <form v-else @submit.prevent="handleLogin">
      <input v-model="username" placeholder="Username" />
      <input v-model="password" type="password" placeholder="Password" />
      <button type="submit">Login</button>
    </form>
  </div>
</template>
```

### Direct SDK Access

```typescript
// In any component or composable
const { $sdk } = useNuxtApp();

// Collections
const products = await $sdk.collection('products').getAll();

// Real-time
const tagService = $sdk.tagging('sensor-data');
tagService.subscribe((data) => {
  console.log('New data:', data);
});

// Authentication
const user = await $sdk.auth.getCurrentUser();
```

## Important Notes

### Client-Side Only

MACHHUB SDK runs client-side only. The plugin is marked as `.client.ts`:

```
plugins/
  sdk.client.ts  ✅ Runs only on client
  sdk.ts         ❌ Would run on server too
```

### Auto-imports

Nuxt auto-imports composables from `composables/` directory:
- `useCollection()` - Available everywhere
- `useAuth()` - Available everywhere
- No need to import manually!

### SSR Considerations

Since SDK is client-only, avoid using it in:
- Server-side rendering code
- `asyncData` (use `onMounted` instead)
- Server middleware

```vue
<!-- ✅ Correct -->
<script setup>
const { items, getAll } = useCollection('products');

onMounted(() => {
  getAll(); // Runs client-side only
});
</script>

<!-- ❌ Wrong -->
<script setup>
const { data } = await useAsyncData(async () => {
  const { $sdk } = useNuxtApp();
  return await $sdk.collection('products').getAll(); // Error: SDK not available on server
});
</script>
```

## When to Use What

### Use Zero-Config (`sdk.client.ts`) When:
- ✅ Local development
- ✅ Prototyping
- ✅ VSCode with Designer Extension
- ✅ Want fastest setup

### Use Manual Config (`sdk.client.manual.ts`) When:
- ✅ Production deployment
- ✅ Vercel/Netlify/Cloudflare deployment
- ✅ Multiple environments
- ✅ CI/CD pipelines

## See Also

- [machhub-sdk-initialization](../machhub-sdk-initialization/) - General SDK setup
- [machhub-sdk-architecture](../machhub-sdk-architecture/) - Service patterns
- [machhub-sdk-authentication](../machhub-sdk-authentication/) - Auth details
