# Official MACHHUB Agent Skills (machhub-dev/plugins)

Official [Agent Skills](https://agentskills.io) for MACHHUB development: SDK usage, framework
guides, and the Designer workspace JSON formats. The code in each skill is checked against the SDK
(`@machhub-dev/sdk-ts`) and the MACHHUB API.

Works in Claude Code, claude.ai, GitHub Copilot, Cursor, Codex, ChatGPT, Antigravity, Gemini CLI
and any other host that reads the Agent Skills format. See [Install](#-install).

---

## 🚀 Quick Start

A MACHHUB app is a **client-only SPA**. MACHHUB hosts it and is its backend.

1. Install the [MACHHUB Designer Extension](https://marketplace.visualstudio.com) in VS Code and connect it to a runtime.
2. `npm install @machhub-dev/sdk-ts`
3. Add these skills to your agent. See [Install](#-install).
4. Call `await sdk.Initialize()` with **no arguments**. The same build works in `npm run dev` (through the Designer) and once uploaded (MACHHUB serves the config).
5. Build to `build/`, upload it with the Designer, and set Application Type = SPA.

There are no environment variables, no app IDs or URLs in code, and no server of your own. See `machhub-sdk-initialization`.

---

## 📦 Install

Every path below tracks this repository, so a `machhub` skill update reaches your project with
one command. Nothing here copies files you then have to maintain by hand.

### Any agent — GitHub CLI

Works for GitHub Copilot, Cursor, Antigravity, Gemini CLI, Codex, Claude Code and ~40 other
hosts. Needs GitHub CLI 2.90+.

```bash
# every skill, into the current project
gh skill install machhub-dev/plugins --all --agent github-copilot

# or pick interactively, for a single agent and just yourself
gh skill install machhub-dev/plugins --agent cursor --scope user

# pin to a release instead of tracking master
gh skill install machhub-dev/plugins --all --agent antigravity --pin v1.0.0
```

Update everything you have installed, from any repo:

```bash
gh skill update --all
```

`--scope project` (the default) writes into the repository you are standing in, so the files are
committed and every teammate — and Copilot's cloud agent — gets them. `gh skill update` then
produces a reviewable diff instead of silent drift. `--scope user` installs once for all your
projects.

Agent ids you are most likely to want: `github-copilot`, `claude-code`, `cursor`, `codex`,
`antigravity`, `antigravity-cli`, `gemini-cli`. Run `gh skill install --help` for the full list.

**Where the files land**

| Agent | Project scope | User scope |
| ----- | ------------- | ---------- |
| GitHub Copilot | `.agents/skills/` | `~/.copilot/skills/` |
| Cursor | `.agents/skills/` | `~/.cursor/skills/` |
| Codex | `.agents/skills/` | `~/.agents/skills/` |
| Antigravity (IDE) | `.agents/skills/` | `~/.gemini/antigravity/skills/` |
| Antigravity CLI | `.agents/skills/` | `~/.gemini/antigravity-cli/skills/` |
| Gemini CLI | `.agents/skills/` | `~/.gemini/skills/` |
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |

Most agents share `.agents/skills/`, so installing for several of them writes each skill once.

### Claude Code — plugin

```
/plugin marketplace add machhub-dev/plugins
/plugin install machhub@machhub-dev
```

Or from a shell: `claude plugin marketplace add machhub-dev/plugins && claude plugin install machhub@machhub-dev`.
Update with `/plugin marketplace update machhub-dev`.

To roll it out to a whole team, commit this to the project's `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "machhub-dev": { "source": { "source": "github", "repo": "machhub-dev/plugins" } }
  },
  "enabledPlugins": { "machhub@machhub-dev": true }
}
```

### Codex — plugin

```bash
codex plugin marketplace add machhub-dev/plugins
codex plugin add machhub@machhub-dev
```

Update with `codex plugin marketplace upgrade`.

### Cursor — plugin

Cursor installs plugins from a marketplace, and this repository is one. A team admin adds it
once (Teams plan and above):

1. **Dashboard → Plugins → Team Marketplaces → Add Marketplace → Import from Repo**
2. Point it at `https://github.com/machhub-dev/plugins`
3. Turn on **Enable Auto Refresh** so pushes to `master` roll out automatically

Members then open **Customize**, find **MACHHUB**, and **Install** at project or user scope.

On a personal plan, use the GitHub CLI route above with `--agent cursor`.

### Antigravity

The IDE reads workspace skills from `.agents/skills/`, which is exactly where
`gh skill install --agent antigravity` puts them — nothing else to configure.

The CLI can also take the whole repository as a plugin — the root `plugin.json` and `skills/`
are what it needs:

```bash
git clone https://github.com/machhub-dev/plugins.git machhub-plugins
agy plugin install ./machhub-plugins
```

### ChatGPT — workspace marketplace

A workspace admin or owner imports the marketplace once for everyone (Business, Enterprise, Edu):

1. **Workspace settings → Plugins → Add → Import marketplace**
2. Repository URL: `https://github.com/machhub-dev/plugins` (no subdirectory, branch `master`)
3. Authorize GitHub, then set the `machhub` plugin's availability for your roles

ChatGPT re-syncs daily; **Sync now** pulls a change immediately.

### claude.ai and ChatGPT — upload zips

Every [release](https://github.com/machhub-dev/plugins/releases) attaches one zip per skill
(`machhub-sdk-collections.zip`, …) plus `machhub-plugin.zip` for the whole plugin.

- **claude.ai, one skill:** Customize → Skills → **+** → Create skill → upload the skill zip
- **claude.ai Team/Enterprise, whole plugin:** Organization settings → Plugins → upload `machhub-plugin.zip`
  (GitHub sync there only accepts private repositories, so this public repo is uploaded as a zip)
- **ChatGPT, one skill:** Plugins → Skills → Create → Upload from your computer

Build the zips yourself with `node scripts/package-skills.mjs` (written to `dist/`).

### Updating, at a glance

| Installed with | Update command |
| -------------- | -------------- |
| `gh skill install` | `gh skill update --all` |
| Claude Code plugin | `/plugin marketplace update machhub-dev` |
| Codex plugin | `codex plugin marketplace upgrade` |
| Cursor marketplace | automatic with Auto Refresh, or **Refresh** |
| ChatGPT workspace | daily sync, or **Sync now** |
| Uploaded zip | re-upload from the newest release |

---

## 🧷 Manual copy (last resort)

Only if none of the above fit — an air-gapped machine, or an agent the GitHub CLI does not know.
These files do not update themselves; re-copy them after each release.

```bash
git clone https://github.com/machhub-dev/plugins.git machhub-plugins
mkdir -p .agents/skills
cp -r machhub-plugins/skills/machhub-* .agents/skills/
```

`.agents/skills/` is read by Copilot, Cursor, Codex, Antigravity and Gemini CLI. Claude Code
reads `.claude/skills/` instead. Both directory names also work at `~/` for a global install.

---

## ✅ Verify the install

**In any agent, ask:**
```
"Initialize MACHHUB SDK in my Angular project using zero-config"
```

**Expected response should:**
- Reference the `machhub-sdk-initialization` and `machhub-angular` skills
- Call `sdk.Initialize()` with no arguments in `provideAppInitializer`
- Add no environment config, SSR, or server code

---

## 📁 Designer Workspace Layout

A MACHHUB project keeps its server-side definitions as JSON on disk, one underscore-prefixed
folder per panel in the Designer extension. Each panel shows a colored status dot per file
(synced / modified / new locally / server only) and offers Upload, Download and Compare.

```
my-app/
├── _nodered/            # Node-RED workspace (flows, settings, node_modules)
├── _collections/        # One <name>.json per collection
├── _processes/          # One <name>.json per process; sub-folders are the process folder
├── _namespaces/         # One <name>.json per namespace (UNS topic tree + historian)
├── _permissions/
│   ├── permissions.json # The feature/action/scope catalogue
│   └── groups.json      # Group (role) assignments over that catalogue
├── build/               # Application build output (path is configurable)
├── src/                 # Your application source
├── .gitignore
├── package.json
└── ...
```

| Folder | Panel | Identity | Skill |
| ------ | ----- | -------- | ----- |
| `_collections/` | Collections | the `name` **inside** the file | `machhub-collection-json` |
| `_processes/`   | Processes   | the `name` inside the file **plus** its folder under `_processes/` | `machhub-sdk-processes` |
| `_namespaces/`  | Namespaces  | the root `name` inside the file | `machhub-namespace-json` |
| `_permissions/` | Permissions | fixed filenames | `machhub-permission-json`, `machhub-groups-json` |
| `_nodered/`     | NODE-RED Flows | n/a — the whole folder is uploaded | — |
| `build/`        | Build       | n/a — the whole folder is uploaded | — |

**Two rules that apply to every folder:**

1. **The `name` field inside the document is the identity, not the filename.** The extension
   never renames or moves your files, so a downloaded record is written back into whichever
   file already declares that name. Change `name` and you are describing a *different*
   record — uploading creates a second one rather than renaming the first.
2. **Two files declaring the same name are one record to the server**, so neither is
   uploaded; the panel reports the conflict rather than letting one silently win.

Data Bridge has no folder here — it is imported through the web UI, because a bridge carries
a database credential that should not sit in a file the extension pushes on every deploy.

---

## 📚 Skills Overview

### Core SDK Skills

Framework-agnostic guides for the MACHHUB TypeScript SDK:

| Skill Name                   | Description                                                                 |
| ---------------------------- | --------------------------------------------------------------------------- |
| `machhub-sdk-initialization` | Zero-config `Initialize()`, how config discovery works, API keys for Node   |
| `machhub-sdk-architecture`   | App structure: one SDK module, thin data modules, hubs, error handling      |
| `machhub-sdk-collections`    | CRUD, record IDs, relations, filters, JSON-array filters, expand            |
| `machhub-sdk-authentication` | Login, logout, session restore, client-side guards                          |
| `machhub-sdk-authorization`  | `checkAction`/`checkPermission`, users, groups, permissions                 |
| `machhub-sdk-realtime`       | Tag subscribe/publish, wildcards, and the fan-out hub                       |
| `machhub-sdk-file-handling`  | File fields: upload, replace, clear, download as Blob                       |
| `machhub-sdk-advanced`       | Historian reads and CSV export, Data Bridge queries                         |
| `machhub-sdk-processes`      | Server-side Python/TypeScript processes and their triggers                  |

### Framework Skills

Each one is a client-only SPA uploaded as Application Type = SPA:

| Skill Name                 | Description                                                          |
| -------------------------- | -------------------------------------------------------------------- |
| `machhub-angular`          | Angular: standalone, signals, `provideAppInitializer`, `authGuard`   |
| `machhub-nextjs-react`     | React: Vite SPA (or Next.js static export)                           |
| `machhub-nuxt-vue`         | Vue 3: Vite SPA (or Nuxt with `ssr: false`, generated)               |
| `machhub-sveltekit-svelte` | SvelteKit: adapter-static SPA with Svelte 5 runes                    |

### Workspace File Skills

The JSON documents a MACHHUB project keeps on disk. All but Data Bridge are synced
by the Designer extension — see [Designer Workspace Layout](#-designer-workspace-layout).

| Skill Name                 | Workspace file                          | Description                                                       |
| -------------------------- | --------------------------------------- | ----------------------------------------------------------------- |
| `machhub-collection-json`  | `_collections/<name>.json`              | Collection schemas with relations and indexes                     |
| `machhub-namespace-json`   | `_namespaces/<name>.json`               | UNS topic trees (folders, tags) and historian settings            |
| `machhub-permission-json`  | `_permissions/permissions.json`         | The permission catalogue — features, actions and scopes           |
| `machhub-groups-json`      | `_permissions/groups.json`              | Group (role) assignments over that catalogue                      |
| `machhub-databridge-json`  | *(not synced — web UI only)*            | Data Bridge — MySQL routes, mappings, watermarks                  |

### Other Skills

| Skill Name                 | Description                                                            |
| -------------------------- | ---------------------------------------------------------------------- |
| `machhub-headless-sdk`     | Running the SDK from a standalone Node script, no browser or UI        |
| `machhub-runtime-query`    | Answering data questions against the live runtime, read-only           |

**Total: 20 skills**

---

## 🎯 The rules every app skill enforces

- **Zero-config.** Call `sdk.Initialize()` with no arguments, with no `.env` URLs, app IDs, or developer keys in a frontend.
- **No server of your own.** No API routes, server actions, SSR, or Express. MACHHUB replaces any `server.js` you upload with its own, which serves the SDK's config and proxies its calls. Server-side logic belongs in a **Process**.
- **SDK only.** Don't `fetch` MACHHUB REST paths or build your own login. `sdk.auth.login` stores and sends the token.
- **Opaque IDs.** Pass `record.id` back exactly as returned. Never rebuild `<domain>.<collection>:<id>`.
- **Build to `build/`** and upload it as an **SPA**.

---

## 🛠️ Development Workflow

1. Pick the framework skill (Angular, React, Vue, or SvelteKit) and follow its setup.
2. Connect the Designer extension to a runtime, then run `npm run dev`.
3. Use the core SDK skills for data, auth, tags, files, and history.
4. Run `npm run build`, then upload `build/` from the Designer and set the application type to SPA.

---

## 📂 Repository Structure

```
plugins/
├── .claude-plugin/
│   ├── plugin.json                # Claude Code plugin manifest
│   └── marketplace.json           # Claude Code marketplace (machhub-dev)
├── .cursor-plugin/
│   ├── plugin.json                # Cursor plugin manifest
│   └── marketplace.json           # Cursor marketplace (machhub-dev)
├── .codex-plugin/
│   └── plugin.json                # Codex / ChatGPT plugin manifest
├── .agents/plugins/
│   └── marketplace.json           # Codex / ChatGPT marketplace (machhub-dev)
├── assets/
│   ├── machhub-logo.svg            # Wordmark-free logo, light backgrounds
│   ├── machhub-logo-dark.svg       # Same logo, dark backgrounds
│   ├── machhub-icon.svg            # Tile icon (Codex composer)
│   └── machhub-icon.png            # Tile icon 512px (Cursor + Codex)
├── scripts/
│   ├── validate.mjs               # Spec + manifest checks
│   └── package-skills.mjs         # Skill + plugin zips for upload
├── plugin.json                    # Antigravity plugin manifest
├── README.md                      # This file
├── PUBLISHING.md                  # Release + marketplace submission guide
└── skills/
    ├── machhub-collection-json/    # Collection JSON schema
    ├── machhub-namespace-json/     # Namespace JSON schema (topic tree + historian)
    ├── machhub-permission-json/    # Permission JSON schema
    ├── machhub-groups-json/        # Group assignment JSON schema
    ├── machhub-databridge-json/    # Data Bridge JSON schema (3 templates)
    ├── machhub-headless-sdk/       # Standalone Node scripts
    ├── machhub-runtime-query/      # Live read-only runtime queries
    ├── machhub-sdk-initialization/ # SDK setup
    ├── machhub-sdk-architecture/   # App structure
    ├── machhub-sdk-collections/    # CRUD, IDs, queries
    ├── machhub-sdk-authentication/ # Login & session
    ├── machhub-sdk-authorization/  # Permission checks & group management
    ├── machhub-sdk-processes/      # Processes & trigger-based execution
    ├── machhub-sdk-realtime/       # Live tags
    ├── machhub-sdk-file-handling/  # File fields
    ├── machhub-sdk-advanced/       # Historian & Data Bridge
    ├── machhub-angular/            # Angular SPA
    ├── machhub-nextjs-react/       # React SPA (Vite / Next static export)
    ├── machhub-nuxt-vue/           # Vue SPA (Vite / Nuxt client-only)
    └── machhub-sveltekit-svelte/   # SvelteKit SPA (adapter-static)
```

---

## 🎓 Learning Path

1. **Framework**: your framework skill (it links to the rest)
2. **Start**: `machhub-sdk-initialization` (zero-config setup)
3. **Structure**: `machhub-sdk-architecture`
4. **Data**: `machhub-sdk-collections`, then `machhub-sdk-file-handling`
5. **Users**: `machhub-sdk-authentication`, then `machhub-sdk-authorization`
6. **Live and history**: `machhub-sdk-realtime`, then `machhub-sdk-advanced`
7. **Server logic**: `machhub-sdk-processes`

---

## 🔄 Recent Updates (September 2026)

- ✅ App skills rewritten around client-only SPAs with zero-config `Initialize()`. The manual "production" config, server routes, and hand-written REST calls are gone
- ✅ SDK skills checked against the SDK and API source: real method names, record ID format, relation handling, historian ranges, and MQTT dispatch behaviour
- ✅ Standalone templates that had drifted from the SDK were removed. Each skill's code now lives in its SKILL.md

---

## 🤝 Contribution

Contributions welcome from MACHHUB developers:

- Submit PRs for bug fixes, improvements, or new skills
- Ensure alignment with MACHHUB best practices
- Include proper documentation and examples
- Check code against the SDK source and a real MACHHUB runtime
- Follow the zero-config, client-only approach

---

## 📄 License

Licensed under the **Mozilla Public License 2.0 (MPL-2.0)**. See [LICENSE](LICENSE) for details.

---

**Built with ❤️ by the MACHHUB team**
