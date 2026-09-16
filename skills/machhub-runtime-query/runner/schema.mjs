// schema.mjs — dump the LIVE runtime schema so a query can be written against real fields.
//
// Prints every collection with its fields and types (enum options shown inline, since the
// agent must filter on the actual allowed values), plus tag/historian topic counts and
// process names. Hits the Designer proxy on :61888 — no auth needed (proxy injects it).
//
// Usage:
//   node .claude/skills/machhub-runtime-query/runner/schema.mjs            # everything
//   node .claude/skills/machhub-runtime-query/runner/schema.mjs items      # only collections matching "items"

const BASE = process.env.MACHHUB_HTTP_URL || 'http://localhost:61888';
const only = process.argv[2];

async function getJSON(path) {
  const res = await fetch(`${BASE}/machhub/${path}`);
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

function fieldType(f) {
  if (f.type === 'enum' && Array.isArray(f.enumOptions)) {
    return `enum(${f.enumOptions.map((o) => JSON.stringify(o)).join(', ')})`;
  }
  const ref = f.reference || f.relation || f.relatedCollection;
  if (f.type === 'record' && ref) return `record -> ${ref}`;
  return f.type ?? 'unknown';
}

try {
  const cols = await getJSON('designer/collections');
  const list = Array.isArray(cols) ? cols : cols.collections || cols.data || [];
  const shown = only ? list.filter((c) => (c.name || c.collectionName || '').toLowerCase().includes(only.toLowerCase())) : list;

  console.log(`# MACHHUB runtime schema  (${BASE})  —  ${shown.length}/${list.length} collections\n`);
  for (const c of shown) {
    const name = c.name || c.collectionName;
    console.log(`## ${name}${c.description ? '  — ' + c.description : ''}`);
    for (const f of c.fields || []) {
      console.log(`  - ${f.name}: ${fieldType(f)}${f.required ? ' (required)' : ''}`);
    }
    console.log('');
  }

  if (!only) {
    const [tags, htags, procs] = await Promise.all([
      getJSON('tag/list').catch(() => []),
      getJSON('historian/list').catch(() => []),
      getJSON('processes/domain').catch(() => []),
    ]);
    console.log(`# Tags: ${tags.length}   Historized topics: ${htags.length}   Processes: ${procs.length}`);
    if (procs.length) console.log('Process names: ' + procs.map((p) => p.name).join(', '));
  }
} catch (e) {
  console.error('Schema dump failed:', e.message);
  console.error('Check that the MACHHUB Designer runtime connection (VS Code status bar) shows "Connected".');
  process.exit(1);
}
