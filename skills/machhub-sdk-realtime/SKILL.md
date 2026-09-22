---
name: machhub-sdk-realtime
description: "Live tag values in a MACHHUB app — list tags, subscribe (with + and # wildcards), publish, and unsubscribe through `sdk.tag`, plus the SDK's one-handler-per-topic behaviour and a fan-out hub so several components can watch the same tag. Use for live dashboards, machine status, and writing setpoints."
license: MPL-2.0
metadata:
  related_skills: "machhub-sdk-initialization, machhub-sdk-advanced, machhub-namespace-json"
---

## Topics

Tags are MQTT topics in the Unified Namespace (UNS). A topic starts with the **namespace name** and follows the tree you see on the Namespace page, e.g. `PlantA/Line1/Filler/Temperature`. Get exact names from that page, from `machhub-namespace-json`, or at runtime:

```ts
const topics: string[] = await sdk.tag.getAllTags();
```

The SDK connects to MQTT over WebSocket at `<app origin>/mqtt` during `Initialize()`. There is nothing to configure.

---

## API

| Call | Notes |
|---|---|
| `tag.subscribe(topic, (value, topic) => …)` | `topic` may use `+` (one level) and `#` (the rest). `value` is parsed JSON, or the raw string if it isn't JSON |
| `tag.unsubscribe(topic)` | Takes **one topic string** (not an array) and removes that topic's handler |
| `tag.publish(topic, value, retain = true)` | Objects are sent as JSON. **Retained by default**, so new subscribers get this value immediately. Pass `false` for events that shouldn't stick |
| `tag.getAllTags()` | `string[]` of known topics |

There is **no** `getValue`, no subscription ID, and no `sdk.tagging(...)`. For the latest *stored* value, use the historian: `sdk.historian.getLastNValues(topic, 1)` (see `machhub-sdk-advanced`). A retained message also arrives right after you subscribe.

---

## ⚠️ How the SDK dispatches messages

Read this before subscribing from more than one place:

1. **One handler per topic string.** Subscribing again to the same topic *replaces* the earlier handler. So if two components both call `subscribe('A/B')`, only the second one gets updates.
2. **First match wins.** An incoming message goes to the first subscription whose pattern matches. With `A/#` and `A/B` both subscribed, a message on `A/B` reaches only whichever was subscribed first.
3. **`unsubscribe(topic)` removes that topic for everyone** who subscribed to it.

So a component must not subscribe to the SDK directly if anything else might subscribe to the same topic. Route subscriptions through one small hub.

### Tag hub (fan-out)

```ts
// src/lib/machhub/tags.ts
import { getSDK } from './sdk'; // see machhub-sdk-initialization

type Listener = (value: unknown, topic: string) => void;
const listeners = new Map<string, Set<Listener>>();
const last = new Map<string, unknown>();

/** Subscribe to one exact topic. Returns an unsubscribe function. Safe to call from many components. */
export async function watchTag(topic: string, fn: Listener): Promise<() => void> {
  const sdk = await getSDK();
  let set = listeners.get(topic);
  if (!set) {
    set = new Set();
    listeners.set(topic, set);
    sdk.tag.subscribe(topic, (value, t) => {
      last.set(topic, value);
      for (const l of listeners.get(topic) ?? []) l(value, t ?? topic);
    });
  } else if (last.has(topic)) {
    fn(last.get(topic), topic); // late joiners get the current value
  }
  set.add(fn);

  return () => {
    const s = listeners.get(topic);
    if (!s) return;
    s.delete(fn);
    if (s.size === 0) {
      listeners.delete(topic);
      last.delete(topic);
      sdk.tag.unsubscribe(topic);
    }
  };
}

export async function writeTag(topic: string, value: unknown, retain = true) {
  const sdk = await getSDK();
  await sdk.tag.publish(topic, value, retain);
}
```

Use exact topics with the hub. If you need a wildcard like `Line1/+/Status`, make it the **only** subscription covering those topics.

Each framework skill shows the component wrapper (a React hook, a Svelte `$effect`, a Vue `onUnmounted`, Angular `DestroyRef`). The rule is the same everywhere: **call the returned unsubscribe when the component goes away.**

---

## Writing values

```ts
await writeTag('PlantA/Line1/Filler/Setpoint', 72.5);
await writeTag('PlantA/Line1/Events/Reset', { by: user.username, at: new Date().toISOString() }, false);
```

- Publishing to a tag that a device driver owns (Modbus, OPC UA, S7, …) is a **write to the machine**. Confirm with the user in the UI first, and check permissions (`machhub-sdk-authorization`).
- Use `retain = false` for one-shot events and commands, so they don't replay to every new subscriber.

---

## Live vs history

| Need | Use |
|---|---|
| Value changes as they happen | `tag.subscribe` (this skill) |
| Last stored value, a time range, trends, CSV | `sdk.historian` (`machhub-sdk-advanced`). The tag must have historization on |
| Business records (orders, alarms you acknowledge) | Collections (`machhub-sdk-collections`) |

For a chart that needs both, load the recent range from the historian first, then append values from `subscribe`.
