#!/usr/bin/env node
// Builds upload-ready zips in dist/:
//   <skill-name>.zip    one skill, <skill-name>/SKILL.md at the root — for claude.ai
//                       (Customize > Skills) and ChatGPT (Plugins > Skills > Upload)
//   machhub-plugin.zip  the whole plugin, manifests at the root — for claude.ai
//                       Organization settings > Plugins
//
// Zips are cut from a git tree, so only committed content is included.
// Usage: node scripts/package-skills.mjs [ref]   (default ref: HEAD)

import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ref = process.argv[2] ?? 'HEAD';
const dist = join(root, 'dist');

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });

if (ref === 'HEAD' && git('status', '--porcelain', '--', 'skills').trim()) {
  console.warn('! skills/ has uncommitted changes; they are not included in the zips');
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist);

const skills = git('ls-tree', '-d', '--name-only', `${ref}:skills`).split('\n').filter(Boolean);
for (const name of skills) {
  git('archive', '--format=zip', `--prefix=${name}/`, '-o', join(dist, `${name}.zip`), `${ref}:skills/${name}`);
}

git('archive', '--format=zip', '-o', join(dist, 'machhub-plugin.zip'), ref, '.claude-plugin', '.codex-plugin', 'skills', 'assets', 'LICENSE', 'README.md');

console.log(`✓ ${readdirSync(dist).length} zips written to dist/ (${skills.length} skills + plugin)`);
