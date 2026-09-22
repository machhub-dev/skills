---
name: machhub-sdk-authentication
description: Log users in and out of a MACHHUB app with the SDK (`sdk.auth`) — login, logout, restoring a session on page load, the current user, JWT data, and password changes. Use whenever an app needs a login screen, a logged-in user, or a signed-out redirect.
license: MPL-2.0
metadata:
  related_skills: "machhub-sdk-initialization, machhub-sdk-authorization"
---

## How MACHHUB auth works

- `sdk.auth.login(username, password)` posts to MACHHUB and **stores the JWT itself**: in `localStorage` under `x-machhub-auth-tkn-<appId>` in the browser, and in memory in Node.
- Every SDK request then carries `Authorization: Bearer <token>` automatically.
- `sdk.auth.logout()` deletes the stored token. Nothing is sent to the server.

So the app never handles the token, never sets cookies, and never needs a server. **Don't** build your own sessions, cookies, JWT parsing for auth decisions, or server-side guards (`middleware.ts`, `hooks.server.ts`, `+page.server.ts`, Express). The token lives in the browser, so login checks run in the browser.

---

## API

| Call | Returns | Notes |
|---|---|---|
| `auth.login(username, password)` | `{ tkn }` | Throws `Error('Login failed: ...')` on bad credentials |
| `auth.logout()` | `void` | Clears the stored token |
| `auth.getCurrentUser()` | `User` | `GET /auth/me`. Throws if not logged in |
| `auth.validateCurrentUser()` | `{ valid }` | **Throws** when no token is stored, so wrap it in try/catch |
| `auth.validateJWT(token)` | `{ valid }` | Validate an arbitrary token |
| `auth.getJWTData()` | decoded payload | Local decode only, not a validity check. Throws when no token is stored |
| `auth.changePassword(oldPassword, newPassword)` | `{ ok, message }` | For the logged-in user |

`User` has `id` (a RecordID), `firstName`, `lastName`, `username`, `email`, `number`, `userImage`, `createdDt`, and `group_ids`.

User and group administration (`getUsers`, `createUser`, `updateUser`, groups, permissions) is in `machhub-sdk-authorization`.

---

## Auth state

One small store is all an app needs. The shape is framework-agnostic; each framework skill wraps it idiomatically (React context, Svelte runes, Vue composable, Angular service).

```ts
// src/lib/machhub/auth.ts
import type { User } from '@machhub-dev/sdk-ts';
import { getSDK } from './sdk'; // see machhub-sdk-initialization

let user: User | null = null;
let restored = false;

/** Call once on app load. Resolves to the logged-in user, or null. */
export async function restoreSession(): Promise<User | null> {
  if (restored) return user;
  const sdk = await getSDK();
  try {
    const { valid } = await sdk.auth.validateCurrentUser(); // throws if no token
    user = valid ? await sdk.auth.getCurrentUser() : null;
  } catch {
    user = null;
  }
  restored = true;
  return user;
}

export async function login(username: string, password: string): Promise<User> {
  const sdk = await getSDK();
  await sdk.auth.login(username, password);
  user = await sdk.auth.getCurrentUser();
  restored = true;
  return user;
}

export async function logout(): Promise<void> {
  const sdk = await getSDK();
  await sdk.auth.logout();
  user = null;
}

export const currentUser = () => user;
```

**Guarding pages:** before rendering a private page, `await restoreSession()`, and send the user to `/login` if it returns `null`. Do this in the client router: a React `<RequireAuth>`, a SvelteKit universal `+layout.ts` with `ssr = false`, a Nuxt client middleware, or an Angular `CanActivateFn`.

**Expired tokens:** the SDK doesn't refresh tokens. When a call fails with 401, clear state with `logout()` and redirect to the login page.

---

## Login form essentials

- Use `autocomplete="username"` and `autocomplete="current-password"` so password managers work.
- Show the error message from the thrown `Error`, and keep the typed username.
- After login, go back to the page the user originally asked for (pass it as `?redirectTo=`).

---

## Checklist

- [ ] Login uses `sdk.auth.login`, with no custom session or cookie code
- [ ] The session is restored on load with `validateCurrentUser` inside try/catch
- [ ] Private pages are guarded in the client router
- [ ] A 401 leads to logout and the login page
- [ ] No token is ever read, stored, or sent by the app itself
