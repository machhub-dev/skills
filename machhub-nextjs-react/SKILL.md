---
name: machhub-nextjs-react
description: Complete guide for integrating MACHHUB SDK with Next.js and React applications, including App Router, Server Components, Client Components, and React hooks.
related_skills: [machhub-sdk-initialization, machhub-sdk-architecture, machhub-sdk-collections, machhub-sdk-realtime]
---

## Overview

This skill covers **MACHHUB SDK integration with Next.js and React**, including App Router, Server/Client Components, React hooks, and Next.js-specific patterns.

**Use this skill when:**
- Building Next.js applications with MACHHUB
- Using React with MACHHUB SDK
- Implementing Server Components and Client Components
- Working with Next.js App Router
- Creating custom React hooks for MACHHUB

**Prerequisites:**
- Next.js installed: `npx create-next-app@latest`
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
# Create Next.js app
npx create-next-app@latest my-machhub-app
cd my-machhub-app

# Install MACHHUB SDK
npm install @machhub-dev/sdk-ts
```

---

## Initialization Method Priority

**⭐ RECOMMENDED: Zero-Configuration with Designer Extension**

For development in VSCode, use the **MACHHUB Designer Extension** for automatic zero-config initialization:

1. Install MACHHUB Designer Extension in VSCode
2. Use templates from `machhub-nextjs-react/templates/sdk-context.tsx` (zero-config)
3. SDK auto-configures - no manual setup needed!

**For Production: Manual Configuration**

When deploying to production, use manual configuration:
- See templates: `machhub-nextjs-react/templates/sdk-context.manual.tsx`
- Configure NEXT_PUBLIC_* environment variables
- See `machhub-sdk-initialization` for details

---

## SDK Service (Client-Side)

```typescript
// lib/sdk.service.ts
'use client'; // Client-side only

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

export const sdkService = SDKService.getInstance();

export async function getOrInitializeSDK(config?: SDKConfig): Promise<SDK> {
  return sdkService.getOrInitializeSDK(config);
}
```

---

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_MACHHUB_APP_ID=your-app-id
NEXT_PUBLIC_MACHHUB_HTTP_URL=http://localhost:80
NEXT_PUBLIC_MACHHUB_MQTT_URL=mqtt://localhost:1883
```

```typescript
// lib/config.ts
export const machhubConfig = {
  application_id: process.env.NEXT_PUBLIC_MACHHUB_APP_ID!,
  httpUrl: process.env.NEXT_PUBLIC_MACHHUB_HTTP_URL,
  mqttUrl: process.env.NEXT_PUBLIC_MACHHUB_MQTT_URL
};
```

---

## SDK Provider (Context)

```typescript
// components/providers/sdk-provider.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { SDK } from '@machhub-dev/sdk-ts';
import { sdkService } from '@/lib/sdk.service';
import { machhubConfig } from '@/lib/config';

interface SDKContextType {
  sdk: SDK | null;
  isInitialized: boolean;
  error: Error | null;
}

const SDKContext = createContext<SDKContextType>({
  sdk: null,
  isInitialized: false,
  error: null
});

export function SDKProvider({ children }: { children: ReactNode }) {
  const [sdk, setSdk] = useState<SDK | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function initSDK() {
      try {
        await sdkService.initialize(machhubConfig);
        setSdk(sdkService.getSDK());
        setIsInitialized(true);
      } catch (err) {
        setError(err as Error);
        console.error('Failed to initialize SDK:', err);
      }
    }

    initSDK();
  }, []);

  return (
    <SDKContext.Provider value={{ sdk, isInitialized, error }}>
      {children}
    </SDKContext.Provider>
  );
}

export function useSDK() {
  const context = useContext(SDKContext);
  if (!context) {
    throw new Error('useSDK must be used within SDKProvider');
  }
  return context;
}
```

---

## Root Layout Setup

```typescript
// app/layout.tsx
import { SDKProvider } from '@/components/providers/sdk-provider';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SDKProvider>
          {children}
        </SDKProvider>
      </body>
    </html>
  );
}
```

---

## Custom Hooks

### useCollection Hook

```typescript
// hooks/use-collection.ts
'use client';

import { useState, useEffect } from 'react';
import { useSDK } from '@/components/providers/sdk-provider';

export function useCollection<T>(collectionName: string) {
  const { sdk, isInitialized } = useSDK();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isInitialized || !sdk) {
      return;
    }

    async function fetchData() {
      try {
        setLoading(true);
        const result = await sdk.collection(collectionName).getAll();
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [sdk, isInitialized, collectionName]);

  const create = async (item: Omit<T, 'id'>): Promise<T> => {
    if (!sdk) throw new Error('SDK not initialized');
    const created = await sdk.collection(collectionName).create(item);
    setData(prev => [...prev, created]);
    return created;
  };

  const update = async (id: string, updates: Partial<T>): Promise<T> => {
    if (!sdk) throw new Error('SDK not initialized');
    const fullId = `myapp.${collectionName}:${id}`;
    const updated = await sdk.collection(collectionName).update(fullId, updates);
    setData(prev => prev.map(item => 
      (item as any).id === id ? updated : item
    ));
    return updated;
  };

  const remove = async (id: string): Promise<void> => {
    if (!sdk) throw new Error('SDK not initialized');
    const fullId = `myapp.${collectionName}:${id}`;
    await sdk.collection(collectionName).delete(fullId);
    setData(prev => prev.filter(item => (item as any).id !== id));
  };

  return { data, loading, error, create, update, remove };
}
```

### useRealtimeTag Hook

```typescript
// hooks/use-realtime-tag.ts
'use client';

import { useState, useEffect } from 'react';
import { useSDK } from '@/components/providers/sdk-provider';

export function useRealtimeTag<T = any>(tagName: string) {
  const { sdk, isInitialized } = useSDK();
  const [data, setData] = useState<T | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (!isInitialized || !sdk) {
      return;
    }

    const callback = (newData: T) => {
      setData(newData);
      setLastUpdate(new Date());
    };

    sdk.tag.subscribe(tagName, callback);

    return () => {
      sdk.tag.unsubscribe([tagName]);
    };
  }, [sdk, isInitialized, tagName]);

  const publish = async (value: T) => {
    if (!sdk) throw new Error('SDK not initialized');
    await sdk.tag.publish(tagName, value);
  };

  return { data, lastUpdate, publish };
}
```

### useAuth Hook

```typescript
// hooks/use-auth.ts
'use client';

import { useState, useEffect } from 'react';
import { useSDK } from '@/components/providers/sdk-provider';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const { sdk, isInitialized } = useSDK();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isInitialized || !sdk) return;

    async function checkAuth() {
      try {
        const currentUser = await sdk.auth.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [sdk, isInitialized]);

  const login = async (username: string, password: string) => {
    if (!sdk) throw new Error('SDK not initialized');
    await sdk.auth.login(username, password);
    const currentUser = await sdk.auth.getCurrentUser();
    setUser(currentUser);
    router.push('/dashboard');
  };

  const logout = async () => {
    if (!sdk) throw new Error('SDK not initialized');
    await sdk.auth.logout();
    setUser(null);
    router.push('/login');
  };

  return { user, loading, login, logout };
}
```

---

## Client Component Example

```typescript
// app/products/page.tsx
'use client';

import { useCollection } from '@/hooks/use-collection';
import { useState } from 'react';

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
}

export default function ProductsPage() {
  const { data: products, loading, error, create, remove } = useCollection<Product>('products');
  const [newProduct, setNewProduct] = useState({ name: '', price: 0 });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create(newProduct);
      setNewProduct({ name: '', price: 0 });
    } catch (err) {
      console.error('Failed to create product:', err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Products</h1>

      <form onSubmit={handleCreate} className="mb-6">
        <input
          type="text"
          placeholder="Product name"
          value={newProduct.name}
          onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
          className="border p-2 mr-2"
        />
        <input
          type="number"
          placeholder="Price"
          value={newProduct.price}
          onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
          className="border p-2 mr-2"
        />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
          Add Product
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {products.map((product) => (
          <div key={product.id} className="border p-4 rounded">
            <h3 className="font-bold">{product.name}</h3>
            <p className="text-lg">${product.price}</p>
            {product.description && <p className="text-sm text-gray-600">{product.description}</p>}
            <button
              onClick={() => remove(product.id)}
              className="mt-2 bg-red-500 text-white px-3 py-1 rounded text-sm"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Server Component with Server Actions

```typescript
// app/products/actions.ts
'use server';

import { SDK } from '@machhub-dev/sdk-ts';
import { revalidatePath } from 'next/cache';

// Note: This is for demonstration. SDK should ideally be client-side
// For server actions, consider using MACHHUB REST API directly

export async function getProducts() {
  // In production, use direct API calls or a server-safe method
  const response = await fetch(`${process.env.MACHHUB_HTTP_URL}/collections/products`, {
    headers: {
      'Authorization': `Bearer ${process.env.MACHHUB_DEVELOPER_KEY}`
    }
  });
  return response.json();
}

export async function createProduct(formData: FormData) {
  const name = formData.get('name') as string;
  const price = Number(formData.get('price'));

  // Server-side API call
  await fetch(`${process.env.MACHHUB_HTTP_URL}/collections/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MACHHUB_DEVELOPER_KEY}`
    },
    body: JSON.stringify({ name, price })
  });

  revalidatePath('/products');
}
```

---

## Real-time Dashboard

```typescript
// app/dashboard/page.tsx
'use client';

import { useRealtimeTag } from '@/hooks/use-realtime-tag';

interface SensorData {
  value: number;
  timestamp: string;
  unit: string;
}

export default function DashboardPage() {
  const temperature = useRealtimeTag<SensorData>('temperature/room1');
  const humidity = useRealtimeTag<SensorData>('humidity/room1');

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Real-time Dashboard</h1>

      <div className="grid grid-cols-2 gap-4">
        <div className="border p-4 rounded">
          <h3 className="font-bold">Temperature</h3>
          {temperature.data ? (
            <>
              <p className="text-3xl">{temperature.data.value}°C</p>
              <p className="text-sm text-gray-500">
                Updated: {temperature.lastUpdate?.toLocaleTimeString()}
              </p>
            </>
          ) : (
            <p>Loading...</p>
          )}
        </div>

        <div className="border p-4 rounded">
          <h3 className="font-bold">Humidity</h3>
          {humidity.data ? (
            <>
              <p className="text-3xl">{humidity.data.value}%</p>
              <p className="text-sm text-gray-500">
                Updated: {humidity.lastUpdate?.toLocaleTimeString()}
              </p>
            </>
          ) : (
            <p>Loading...</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Protected Route Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check authentication cookie or header
  const authToken = request.cookies.get('auth-token');

  if (!authToken && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/dashboard/:path*'
};
```

---

## Best Practices

1. ✅ **'use client' directive** - Mark SDK usage as client-side only
2. ✅ **Context Provider** - Wrap app with SDKProvider
3. ✅ **Custom hooks** - Create reusable hooks for common patterns
4. ✅ **Environment variables** - Use NEXT_PUBLIC_ prefix for client vars
5. ✅ **Error boundaries** - Wrap components with error handlers
6. ✅ **Loading states** - Show loading UI while fetching data
7. ✅ **TypeScript** - Use strict typing for better DX
8. ✅ **Cleanup** - Unsubscribe in useEffect cleanup

---

## Next.js + React Checklist

- [ ] SDK service marked with 'use client'
- [ ] SDKProvider wraps entire app
- [ ] Environment variables configured with NEXT_PUBLIC_ prefix
- [ ] Custom hooks created for common patterns
- [ ] Loading and error states handled
- [ ] Real-time subscriptions cleaned up properly
- [ ] Protected routes use middleware or guards
- [ ] TypeScript types defined for collections
- [ ] Error boundaries implemented

---

## Resources

- **Next.js Docs**: https://nextjs.org/docs
- **React Docs**: https://react.dev
- **MACHHUB SDK**: See `machhub-sdk-initialization`
