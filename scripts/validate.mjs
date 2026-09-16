#!/usr/bin/env node
// Checks every skill against the Agent Skills spec (https://agentskills.io/specification)
// and keeps the Claude Code, Codex/ChatGPT, Cursor and Antigravity manifests in sync.
//
// Usage: node scripts/validate.mjs [--tag vX.Y.Z]

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const fail = (msg) => errors.push(msg);

const readJson = (rel) => {
  try {
    return JSON.parse(readFileSync(join(root, rel), 'utf8'));
  } catch (err) {
    fail(`${rel}: ${err.message}`);
    return {};
  }
};

// --- Skills -----------------------------------------------------------------

const ALLOWED_KEYS = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools']);
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const unquote = (v) => {
  const s = v.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
  return s;
};

// Frontmatter here is flat `key: value` plus one nested string map (metadata).
function parseFrontmatter(text, rel) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/);
  if (!match) {
    fail(`${rel}: missing YAML frontmatter`);
    return null;
  }
  const data = {};
  let nested = null;
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const child = line.match(/^\s+([A-Za-z0-9_.-]+):\s*(.*)$/);
    if (child && nested) {
      data[nested][child[1]] = unquote(child[2]);
      continue;
    }
    const top = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!top) {
      fail(`${rel}: cannot parse frontmatter line "${line}"`);
      continue;
    }
    const [, key, value] = top;
    if (value.trim() === '') {
      data[key] = {};
      nested = key;
    } else {
      data[key] = unquote(value);
      nested = null;
    }
  }
  return data;
}

const skillsDir = join(root, 'skills');
const skills = readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

for (const dir of skills) {
  const rel = `skills/${dir}/SKILL.md`;
  if (!existsSync(join(root, rel))) {
    fail(`${rel}: missing`);
    continue;
  }
  const fm = parseFrontmatter(readFileSync(join(root, rel), 'utf8'), rel);
  if (!fm) continue;

  for (const key of Object.keys(fm)) {
    if (!ALLOWED_KEYS.has(key)) fail(`${rel}: unsupported frontmatter key "${key}" (move it under metadata)`);
  }
  if (typeof fm.name !== 'string' || !NAME_RE.test(fm.name) || fm.name.length > 64) {
    fail(`${rel}: name must be 1-64 chars of a-z, 0-9 and single hyphens`);
  } else if (fm.name !== dir) {
    fail(`${rel}: name "${fm.name}" must match folder "${dir}"`);
  }
  if (typeof fm.description !== 'string' || fm.description.length < 1 || fm.description.length > 1024) {
    fail(`${rel}: description must be 1-1024 chars`);
  } else if (/[<>]/.test(fm.description)) {
    fail(`${rel}: description must not contain < or >`);
  }
  if (fm.compatibility !== undefined && (typeof fm.compatibility !== 'string' || fm.compatibility.length > 500)) {
    fail(`${rel}: compatibility must be a string of at most 500 chars`);
  }
  if (fm.metadata !== undefined && typeof fm.metadata !== 'object') {
    fail(`${rel}: metadata must be a map of string values`);
  }
}

// --- Manifests --------------------------------------------------------------

const claudePlugin = readJson('.claude-plugin/plugin.json');
const claudeMarket = readJson('.claude-plugin/marketplace.json');
const codexPlugin = readJson('.codex-plugin/plugin.json');
const codexMarket = readJson('.agents/plugins/marketplace.json');
const cursorPlugin = readJson('.cursor-plugin/plugin.json');
const cursorMarket = readJson('.cursor-plugin/marketplace.json');
const antigravityPlugin = readJson('plugin.json');

const pluginManifests = [
  ['.codex-plugin/plugin.json', codexPlugin, true],
  ['.cursor-plugin/plugin.json', cursorPlugin, true],
  ['plugin.json', antigravityPlugin, false], // Antigravity's manifest carries no version
];
for (const [rel, manifest, hasVersion] of pluginManifests) {
  if (manifest.name !== claudePlugin.name) {
    fail(`${rel}: name "${manifest.name}" differs from .claude-plugin/plugin.json "${claudePlugin.name}"`);
  }
  if (hasVersion && manifest.version !== claudePlugin.version) {
    fail(`${rel}: version ${manifest.version} differs from .claude-plugin/plugin.json ${claudePlugin.version}`);
  }
}
// Antigravity CLI reads the root plugin.json; Codex only skips it because the $schema is foreign.
if (antigravityPlugin.$schema !== 'https://antigravity.google/schemas/v1/plugin.json') {
  fail('plugin.json: $schema must stay https://antigravity.google/schemas/v1/plugin.json so Codex keeps using .codex-plugin/plugin.json');
}
for (const [rel, market] of [
  ['.claude-plugin/marketplace.json', claudeMarket],
  ['.agents/plugins/marketplace.json', codexMarket],
  ['.cursor-plugin/marketplace.json', cursorMarket],
]) {
  if (!market.plugins?.some((p) => p.name === claudePlugin.name)) {
    fail(`${rel}: no entry for plugin "${claudePlugin.name}"`);
  }
}
for (const entry of codexMarket.plugins ?? []) {
  if (!entry.policy?.installation || !entry.policy?.authentication || !entry.category) {
    fail(`.agents/plugins/marketplace.json: "${entry.name}" needs policy.installation, policy.authentication and category`);
  }
}
if ((codexPlugin.interface?.defaultPrompt ?? []).some((p) => p.length > 128)) {
  fail('.codex-plugin/plugin.json: interface.defaultPrompt entries must be at most 128 chars');
}

// Branding assets are referenced by relative path — a missing file shows up as a blank card.
const assetRefs = [
  ['.cursor-plugin/plugin.json', cursorPlugin.logo],
  ['.codex-plugin/plugin.json', codexPlugin.interface?.logo],
  ['.codex-plugin/plugin.json', codexPlugin.interface?.composerIcon],
  ...(codexPlugin.interface?.screenshots ?? []).map((s) => ['.codex-plugin/plugin.json', s]),
];
for (const [rel, ref] of assetRefs) {
  if (ref && !existsSync(join(root, ref.replace(/^\.\//, '')))) {
    fail(`${rel}: asset "${ref}" does not exist`);
  }
}
for (const shot of codexPlugin.interface?.screenshots ?? []) {
  if (!/^\.\/assets\/.+\.png$/.test(shot)) {
    fail(`.codex-plugin/plugin.json: screenshot "${shot}" must be a PNG under ./assets/`);
  }
}

const tagIndex = process.argv.indexOf('--tag');
if (tagIndex !== -1) {
  const tag = process.argv[tagIndex + 1];
  if (tag !== `v${claudePlugin.version}`) fail(`tag "${tag}" does not match plugin version v${claudePlugin.version}`);
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'));
  process.exit(1);
}
console.log(`✓ ${skills.length} skills and 7 manifests valid (${claudePlugin.name}@${claudePlugin.version})`);
