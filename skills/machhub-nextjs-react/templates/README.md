# MACHHUB Next.js + React Templates

Copy-paste ready templates for integrating MACHHUB SDK with Next.js 14+ and React applications.

## Quick Start

**Default: Zero Configuration (Recommended for Development)**

The templates use MACHHUB Designer Extension by default - no configuration needed!

1. Install MACHHUB Designer Extension in VSCode
2. Copy templates to your project
3. Start coding immediately

## Templates

### 1. `sdk-context.tsx` ⭐ **Recommended**
**Zero-config SDK context using Designer Extension**
- No configuration required
- Perfect for development
- Automatic setup via extension
- Client-side only (marked with 'use client')

### 2. `sdk-context.manual.tsx`
**Production SDK context with manual configuration**
- For production deployments
- Uses NEXT_PUBLIC_* environment variables
- Supports custom config prop

### 3. `use-collection.ts`
**Generic collection hook for CRUD operations**
- Full CRUD with React state management
- Loading and error states
- Type-safe with generics
- Optimistic updates

### 4. `use-auth.ts`
**Authentication hook**
- Login/logout functionality
- Current user state
- Permission checking
- Auto-checks auth on mount

### 5. `layout.tsx`
**Root layout with SDK provider**
- App Router compatible
- Wraps app with SDKProvider
- Client component boundary

### 6. `product-list.tsx`
**Example client component**
- Uses useCollection hook
- Full CRUD UI example
- Loading and error states
- Demonstrates client-side data fetching

## Usage

### Quick Setup (Zero-Config) ⭐

```tsx
// 1. Copy sdk-context.tsx to src/contexts/
// 2. Copy layout.tsx to src/app/
// 3. That's it! SDK auto-configures via Designer Extension

// Use in any client component:
'use client';

import { useSDK } from '@/contexts/SDKContext';

export function MyComponent() {
  const sdk = useSDK();
  
  async function loadData() {
    const items = await sdk.collection('items').getAll();
    return items;
  }
  
  return <div>...</div>;
}
```

### Production Setup (Manual Config)

```tsx
// 1. Copy sdk-context.manual.tsx as sdk-context.tsx
// 2. Create .env.local:

NEXT_PUBLIC_MACHHUB_APP_ID=your-app-id
NEXT_PUBLIC_MACHHUB_HTTP_URL=https://your-server.com:80
NEXT_PUBLIC_MACHHUB_MQTT_URL=wss://your-server.com:1884
NEXT_PUBLIC_MACHHUB_NATS_URL=wss://your-server.com:9223
```

### Using Collections

```tsx
'use client';

import { useCollection } from '@/hooks/useCollection';
import { useEffect } from 'react';

interface Product {
  id: string;
  name: string;
  price: number;
}

export function Products() {
  const { items, loading, getAll, create } = useCollection<Product>('products');

  useEffect(() => {
    getAll();
  }, [getAll]);

  async function addProduct() {
    await create({ name: 'New Product', price: 99.99 });
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {items.map(product => (
        <div key={product.id}>{product.name} - ${product.price}</div>
      ))}
      <button onClick={addProduct}>Add Product</button>
    </div>
  );
}
```

### Protected Pages

```tsx
// src/app/dashboard/page.tsx
'use client';

import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return null;

  return <div>Dashboard Content</div>;
}
```

### App Router with SDK

```tsx
// src/app/page.tsx
'use client';

import { useSDKState } from '@/contexts/SDKContext';
import { ProductList } from '@/components/ProductList';

export default function HomePage() {
  const { initialized, error } = useSDKState();

  if (!initialized) {
    return <div>Initializing MACHHUB SDK...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <main>
      <h1>Welcome to MACHHUB</h1>
      <ProductList />
    </main>
  );
}
```

## Important Notes

### Client vs Server Components

MACHHUB SDK runs **client-side only**:

```tsx
// ✅ Correct - Client component
'use client';

import { useSDK } from '@/contexts/SDKContext';

export function MyComponent() {
  const sdk = useSDK();
  // ...
}

// ❌ Wrong - Server component
import { useSDK } from '@/contexts/SDKContext'; // This will error

export default function Page() {
  const sdk = useSDK(); // Cannot use in server component
}
```

### Suspense Boundaries

Use React Suspense for better loading states:

```tsx
import { Suspense } from 'react';
import { ProductList } from '@/components/ProductList';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductList />
    </Suspense>
  );
}
```

## When to Use What

### Use Zero-Config (`sdk-context.tsx`) When:
- ✅ Local development
- ✅ Prototyping
- ✅ VSCode with Designer Extension
- ✅ Want fastest setup

### Use Manual Config (`sdk-context.manual.tsx`) When:
- ✅ Production deployment
- ✅ Vercel/Netlify/AWS deployment
- ✅ Multiple environments
- ✅ CI/CD pipelines

## See Also

- [machhub-sdk-initialization](../machhub-sdk-initialization/) - General SDK setup
- [machhub-sdk-architecture](../machhub-sdk-architecture/) - Service patterns
- [machhub-sdk-authentication](../machhub-sdk-authentication/) - Auth details
