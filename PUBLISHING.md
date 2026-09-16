# Publishing the MACHHUB plugin

For maintainers. Installing is covered in [README.md](README.md#-install).

This repository is at once a **plugin** (`machhub`) and a **marketplace** (`machhub-dev`) for
Claude, OpenAI, Cursor and Antigravity. Each reads its own manifest; all share `skills/`:

| File | Read by |
| ---- | ------- |
| `.claude-plugin/plugin.json` | Claude Code, claude.ai organization plugins |
| `.claude-plugin/marketplace.json` | `/plugin marketplace add machhub-dev/plugins` |
| `.codex-plugin/plugin.json` | Codex, ChatGPT |
| `.agents/plugins/marketplace.json` | `codex plugin marketplace add`, ChatGPT workspace import |
| `.cursor-plugin/plugin.json` | Cursor |
| `.cursor-plugin/marketplace.json` | Cursor team marketplace (Import from Repo) |
| `plugin.json` (root) | Antigravity CLI (`agy plugin install`) |
| `skills/<name>/SKILL.md` | all of them, plus `gh skill install` — must follow the [Agent Skills spec](https://agentskills.io/specification) |

The root `plugin.json` is Antigravity's. Codex looks at the root first but ignores any manifest
whose `$schema` is not `agent-plugins.org`, so it falls through to `.codex-plugin/plugin.json`.
The validator pins that `$schema` for exactly this reason — do not change it.

## Layout: one plugin at the repo root

The repository is named `plugins` but holds a single plugin, `machhub`, at its root. That is
deliberate — a flat layout until a second plugin actually exists.

When one does (the MCP plugin is the likely first), move to `plugins/<name>/` per plugin. The
move touches only internal paths; **every install command in the README stays identical**:

| Change | From | To |
| ------ | ---- | -- |
| `.claude-plugin/marketplace.json` | `"source": "./"` | `"source": "./plugins/machhub"` |
| `.agents/plugins/marketplace.json` | `"path": "./"` | `"path": "./plugins/machhub"` |
| `.cursor-plugin/marketplace.json` | `"source": "."` | `"source": "plugins/machhub"` |
| Manifests, `skills/`, `assets/`, root `plugin.json` | repo root | `plugins/machhub/` |
| `agy plugin install` | `./machhub-plugins` | `./machhub-plugins/plugins/machhub` |
| Manual copy path | `machhub-plugins/skills/` | `machhub-plugins/plugins/machhub/skills/` |

`gh skill` discovers both shapes — `skills/*/SKILL.md` and `plugins/{scope}/skills/*/SKILL.md` —
so installs and `gh skill update` survive the move. `scripts/package-skills.mjs` hardcodes
`skills/`, so update it in the same commit.

## Adding or changing a skill

1. Put it at `skills/<name>/SKILL.md`. The folder name must equal `name:` in the frontmatter.
2. Frontmatter accepts only `name`, `description`, `license`, `compatibility`, `metadata` and
   `allowed-tools`. Anything else (e.g. `related_skills`) goes under `metadata` as a string —
   claude.ai rejects uploads with unknown keys.
3. Run `node scripts/validate.mjs` and `claude plugin validate .`. CI runs both on every push.

## Releasing

Claude Code and Codex both key updates off `version`: users are only offered an update when it
changes.

1. Bump `version` to the same value in `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`
   **and** `.cursor-plugin/plugin.json` (the validator fails if they differ). The root
   `plugin.json` carries no version.
2. Merge to `master`, then tag it:
   ```bash
   git tag v1.1.0 && git push origin v1.1.0
   ```
3. The `Plugin` workflow checks the tag matches the version, builds `dist/*.zip` and attaches
   them to a GitHub release — 20 skill zips plus `machhub-plugin.zip`.

Marketplace users receive the update on their next `marketplace update` / `upgrade`; ChatGPT
workspaces pick it up at the next daily sync.

## The old `machhub-dev/skills` URL

This repository was renamed from `skills` to `plugins`. GitHub keeps a permanent redirect, so
old links keep working: browser URLs, `git clone`, and API calls all follow it. That covers
marketing material, already-added marketplaces (Claude Code, Codex, Cursor, ChatGPT), and
`gh skill` installs — they all reach the repository through the redirect.

**Never create anything named `machhub-dev/skills` again.** A new repository at the old name
silently kills the redirect and breaks every old link and install at once. No placeholder, no
archive, no "just a README pointing at the new one". Only org members can make this mistake, so
it is a discipline rule, not a security boundary.

New material should use `machhub-dev/plugins`. Old material can migrate whenever convenient.

After a rename, confirm the redirect:

```bash
gh api repos/machhub-dev/skills --jq .full_name   # prints machhub-dev/plugins
git clone https://github.com/machhub-dev/skills.git /tmp/redirect-check
```

## Getting listed in the public directories

Both directories review submissions by hand. Neither is needed for the install paths in the
README, which work straight from GitHub.

### Anthropic — Claude plugin directory

Submit through the [plugin directory submission form](https://clau.de/plugin-directory-submission)
with the repository URL `https://github.com/machhub-dev/plugins`. Approved plugins are listed in
the `claude-plugins-official` marketplace, where users find them under `/plugin` → Discover or
install them with `/plugin install machhub@claude-plugins-official`.

### OpenAI — ChatGPT / Codex Plugins Directory

Submit at [platform.openai.com/plugins](https://platform.openai.com/plugins)
([requirements](https://developers.openai.com/plugins/deploy/submission)). Skills-only plugins are
accepted. Before submitting, you need:

- **A verified developer or business identity** on the OpenAI Platform, and Apps Management
  write access in that organization.
- **Brand assets** — the logo, icon and `brandColor` are wired up. Still missing: `screenshots`,
  which must be PNGs under `./assets/` (the validator enforces both rules).
- **Public URLs** in `interface`: `privacyPolicyURL` (required, not set yet), a support URL, and
  `websiteURL` / `termsOfServiceURL` pointing at MACHHUB's own site rather than this repository.

Publishing to a single ChatGPT workspace needs none of this — see the README.

### Cursor Marketplace

Team marketplaces (Dashboard → Plugins → Import from Repo) need no submission and are how
customers should install today. Getting into the public marketplace at
[cursor.com/marketplace](https://cursor.com/marketplace) goes through Cursor; the manifests in
`.cursor-plugin/` already validate against
[Cursor's published schemas](https://github.com/cursor/plugins/tree/main/schemas), which is the
precondition either way, and `logo` already points at the MACHHUB icon.

### GitHub / `gh skill search`

The repository carries the `agent-skills` topic, which is what makes it discoverable through
`gh skill search machhub`. Keep it on the repo.

`gh skill publish --dry-run` validates every skill against agentskills.io and reports repo
hygiene (secret scanning, tag protection). Worth running before a release — it catches things
`scripts/validate.mjs` does not, such as skill bodies over the recommended 500 lines.
