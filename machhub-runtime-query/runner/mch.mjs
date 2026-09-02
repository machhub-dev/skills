// mch.mjs — read-only MACHHUB runtime query harness.
//
// Initializes the MACHHUB SDK against the local Designer runtime connection
// (the proxy on :61888, which injects the developer key + Domain automatically),
// exposes a READ-ONLY `sdk`, runs your query, prints the result as JSON, and exits.
//
// Why this file exists:
//   * Zero-config Node init -> http://localhost:61888 (matches the Designer connection).
//   * SDK.Initialize() also opens an MQTT socket that keeps Node alive, so a plain
//     script would hang forever -> run() forces process.exit() after printing.
//   * MQTT auth fails through the headless proxy; that error is harmless noise for
//     HTTP queries (collections / historian / processes) and is filtered out below.
//
// Usage (from a scratch script, e.g. runner/_scratch.mjs):
//   import { run } from './mch.mjs';
//   run(async (sdk) => sdk.collection('items').filter('itemStatus','=','inactive').count());
//
// Env overrides (optional):
//   MACHHUB_SDK_DIST   absolute path to machhub-sdk-ts/dist/index.js
//   MACHHUB_HTTP_URL   override runtime URL (default http://localhost:61888)
//   MACHHUB_APP_ID     override Domain app id (proxy normally injects this — leave unset)
//   MCH_VERBOSE=1      show SDK init banner + MQTT noise (for debugging)

import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const VERBOSE = !!process.env.MCH_VERBOSE;

// --- Silence harmless headless-MQTT noise on stderr (auth always fails via proxy) ---
const _consoleError = console.error.bind(console);
console.error = (...a) => {
  const s = String(a[0] ?? '');
  if (!VERBOSE && (s.includes('MQTT connection error') || s.includes('Connection refused'))) return;
  _consoleError(...a);
};

// --- Locate the local SDK build (walks up to find a sibling machhub-sdk-ts/dist) ---
function resolveSdkDist() {
  if (process.env.MACHHUB_SDK_DIST) return process.env.MACHHUB_SDK_DIST;
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    const cand = join(dir, 'machhub-sdk-ts', 'dist', 'index.js');
    if (existsSync(cand)) return cand;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

async function loadSDK() {
  const dist = resolveSdkDist();
  if (!dist) {
    throw new Error(
      'Could not locate machhub-sdk-ts/dist/index.js. Build the SDK ' +
      '(`npm run build` in ../machhub-sdk-ts) or set MACHHUB_SDK_DIST to its dist/index.js.'
    );
  }
  const mod = await import(pathToFileURL(dist).href);
  if (!mod.SDK) throw new Error(`SDK export not found in ${dist}`);
  return mod.SDK;
}

// --- Read-only guard: block data mutations at the harness level ---
function applyReadOnlyGuards(sdk) {
  const WRITE = new Set(['create', 'update', 'delete']);
  const realCollection = sdk.collection.bind(sdk);
  sdk.collection = (name) =>
    new Proxy(realCollection(name), {
      get(target, prop, recv) {
        if (WRITE.has(prop)) {
          return () => {
            throw new Error(`Read-only mode: collection('${name}').${String(prop)}() is disabled.`);
          };
        }
        const val = Reflect.get(target, prop, recv);
        if (typeof val === 'function') {
          // Re-wrap chainable methods (filter/sort/limit/... return the Collection itself)
          return (...args) => {
            const r = val.apply(target, args);
            return r === target ? recv : r;
          };
        }
        return val;
      },
    });
  // Block the remaining write surfaces; reads + processes.execute stay available.
  try { sdk.tag.publish = async () => { throw new Error('Read-only mode: tag.publish() is disabled.'); }; } catch { /* not initialized */ }
  try { sdk.processes.changeTriggers = async () => { throw new Error('Read-only mode: processes.changeTriggers() is disabled.'); }; } catch { /* not initialized */ }
}

let _sdk = null;

/** Initialize once and return the read-only SDK instance. */
export async function getSdk() {
  if (_sdk) return _sdk;
  const SDK = await loadSDK();
  const sdk = new SDK();

  const _log = console.log;
  if (!VERBOSE) console.log = () => {}; // hide the "SDK Config: ..." banner
  try {
    const ok = await sdk.Initialize({
      application_id: process.env.MACHHUB_APP_ID || '',
      ...(process.env.MACHHUB_HTTP_URL ? { httpUrl: process.env.MACHHUB_HTTP_URL } : {}),
    });
    if (!ok) {
      throw new Error(
        'SDK Initialize() returned false. Is the MACHHUB Designer runtime connection ' +
        '(VS Code status bar) showing "Connected" on :61888?'
      );
    }
  } finally {
    console.log = _log;
  }

  applyReadOnlyGuards(sdk);
  _sdk = sdk;
  return sdk;
}

function jsonReplacer(_key, value) {
  if (typeof value === 'bigint') return value.toString();
  if (typeof Blob !== 'undefined' && value instanceof Blob) return `[Blob ${value.size} bytes]`;
  return value;
}

/**
 * Run a query function and print its return value as JSON to stdout, then exit.
 * @param {(sdk: import('@machhub-dev/sdk-ts').SDK) => Promise<any>} fn
 */
export async function run(fn) {
  try {
    const sdk = await getSdk();
    const result = await fn(sdk);
    const out = JSON.stringify(result ?? null, jsonReplacer, 2);
    // Write, then exit in the flush callback so output is never truncated.
    process.stdout.write(out + '\n', () => process.exit(0));
  } catch (err) {
    process.stderr.write('\n[MCH ERROR] ' + (err?.stack || err?.message || String(err)) + '\n');
    process.exit(1);
  }
}

/**
 * Best-effort live tag capture. NOTE: MQTT auth currently fails through the headless
 * proxy, so this usually returns []. Prefer historian (HTTP) for recent tag values.
 * @param {string} topic
 * @param {number} ms how long to listen before resolving
 */
export async function subscribeFor(topic, ms = 4000) {
  const sdk = await getSdk();
  const msgs = [];
  await sdk.tag.subscribe(topic, (data, t) => msgs.push({ topic: t ?? topic, data, at: new Date().toISOString() }));
  await new Promise((r) => setTimeout(r, ms));
  try { await sdk.tag.unsubscribe(topic); } catch { /* ignore */ }
  return msgs;
}
