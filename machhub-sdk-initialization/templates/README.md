# MACHHUB SDK Initialization Templates

Templates for setting up and initializing the MACHHUB TypeScript SDK in different environments.

## Templates

### 1. `sdk.service.designer.ts`
**Designer Extension (Zero-config)**
- For local development with VSCode
- MACHHUB Designer Extension integration
- Automatic configuration
- Singleton pattern

**When to use:**
- Local development
- Rapid prototyping
- Designer Extension installed

### 2. `sdk.service.manual.ts`
**Manual Configuration (Production)**
- For production deployments
- SPA and SSR support
- Environment variable integration
- Browser environment detection

**When to use:**
- Production deployments
- SPA applications
- SSR applications (client-side init only)
- CI/CD pipelines

### 3. `config.ts`
**Environment Configuration**
- Centralized SDK configuration
- Environment variable management
- Type-safe config
- Default fallbacks

### 4. `main.spa.ts`
**SPA Entry Point**
- Application bootstrap
- SDK initialization
- Error handling
- Ready state management

## Usage

### Designer Extension (Development)

```typescript
// Copy sdk.service.designer.ts to your project
import { getOrInitializeSDK } from './services/sdk.service';

async function main() {
  const sdk = await getOrInitializeSDK();
  // SDK is ready to use
  const items = await sdk.collection('items').getAll();
}
```

### Manual Configuration (Production)

```typescript
// Copy sdk.service.manual.ts to your project
import { getOrInitializeSDK } from './services/sdk.service';

async function main() {
  const sdk = await getOrInitializeSDK({
    application_id: process.env.MACHHUB_APP_ID!,
    httpUrl: process.env.MACHHUB_HTTP_URL,
    mqttUrl: process.env.MACHHUB_MQTT_URL
  });
  
  const items = await sdk.collection('items').getAll();
}
```

### With Configuration File

```typescript
// 1. Copy config.ts to your project
// 2. Copy sdk.service.manual.ts
// 3. Update your .env file

import { getOrInitializeSDK } from './services/sdk.service';
import { machhubConfig } from './lib/config';

const sdk = await getOrInitializeSDK(machhubConfig);
```

### SPA Application

```typescript
// Copy main.spa.ts as your entry point
// It handles:
// - SDK initialization
// - Error handling
// - DOM ready state
```

## Environment Variables

Create a `.env` file:

```bash
MACHHUB_APP_ID=your-app-id
MACHHUB_HTTP_URL=http://localhost:80
MACHHUB_MQTT_URL=ws://localhost:1884
MACHHUB_NATS_URL=ws://localhost:9223
```

## SSR Considerations

For SSR frameworks (Next.js, Nuxt, SvelteKit):
- SDK initialization must run **client-side only**
- Use `typeof window !== 'undefined'` checks
- Initialize in `onMount`, `useEffect`, or similar lifecycle hooks
- See framework-specific skills for detailed examples

## See Also

- [machhub-angular](../machhub-angular/) - Angular-specific setup
- [machhub-nextjs-react](../machhub-nextjs-react/) - Next.js + React setup
- [machhub-nuxt-vue](../machhub-nuxt-vue/) - Nuxt + Vue setup
- [machhub-sveltekit-svelte](../machhub-sveltekit-svelte/) - SvelteKit + Svelte setup
