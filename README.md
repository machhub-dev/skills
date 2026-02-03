# Official MACHHUB Claude Skills (machhub-dev/skills)

Official Claude Skills designed to support and enhance MACHHUB development workflows.

This repository contains comprehensive Claude skills for MACHHUB, including SDK integration, framework-specific guides, and **57 production-ready templates** for rapid development.

---

## 🚀 Quick Start

**For development, we recommend the zero-configuration approach:**

1. Install [MACHHUB Designer Extension](https://marketplace.visualstudio.com) in VSCode
2. Install MACHHUB SDK: `npm install @machhub-dev/sdk-ts`
3. Copy templates from this repository
4. Start coding - no configuration needed!

For production deployments, see manual configuration in each skill's documentation.

---

## � Installation & Setup

### Using Skills in VSCode (GitHub Copilot)

GitHub Copilot supports Agent Skills through the [Agent Skills standard](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills). Skills are automatically loaded when placed in the correct directories.

**1. Clone this repository:**
```bash
git clone https://github.com/machhub-dev/skills.git
```

**2. Choose your installation method:**

**Option A: Project Skills (Repository-specific)**

Copy skills to your project's `.github/skills/` directory:
```bash
# In your project directory
mkdir -p .github/skills
cp -r /path/to/machhub/skills/machhub-* .github/skills/
```

Structure:
```
your-project/
├── .github/
│   └── skills/
│       ├── machhub-sdk-initialization/
│       │   └── SKILL.md
│       ├── machhub-angular/
│       │   └── SKILL.md
│       └── ...
```

**Option B: Personal Skills (Global, all projects)**

Copy skills to your home directory for use across all projects:
```bash
# Copy to personal skills directory
mkdir -p ~/.copilot/skills
cp -r /path/to/machhub/skills/machhub-* ~/.copilot/skills/
```

Structure:
```
~/.copilot/skills/
├── machhub-sdk-initialization/
│   └── SKILL.md
├── machhub-angular/
│   └── SKILL.md
└── ...
```

**3. Verify skills are loaded:**

No configuration needed! GitHub Copilot automatically discovers skills in:
- `.github/skills/` (project-specific)
- `.claude/skills/` (alternative project location)
- `~/.copilot/skills/` (personal, global)
- `~/.claude/skills/` (alternative personal location)

Open Copilot Chat in VSCode (`Ctrl+Alt+I`) and ask:
```
"What MACHHUB skills are available?"
```

**Note:** Agent Skills work with:
- Copilot coding agent (Chat in IDE)
- GitHub Copilot CLI
- Visual Studio Code Insiders (stable support coming soon)

For more details, see [GitHub's Agent Skills documentation](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills).

---

### Using Skills in Cursor

Cursor supports Agent Skills through the [Agent Skills standard](https://cursor.com/en-US/docs/context/skills). Skills are automatically discovered when placed in the correct directories.

**1. Clone this repository:**
```bash
git clone https://github.com/machhub-dev/skills.git
```

**2. Choose your installation method:**

**Option A: Project Skills (Repository-specific)**

Copy skills to your project's `.cursor/skills/` directory:
```bash
# In your project directory
mkdir -p .cursor/skills
cp -r /path/to/machhub/skills/machhub-* .cursor/skills/
```

Structure:
```
your-project/
├── .cursor/
│   └── skills/
│       ├── machhub-sdk-initialization/
│       │   └── SKILL.md
│       ├── machhub-angular/
│       │   └── SKILL.md
│       └── ...
```

**Option B: Personal Skills (Global, all projects)**

Copy skills to your home directory for use across all projects:
```bash
# Copy to personal skills directory
mkdir -p ~/.cursor/skills
cp -r /path/to/machhub/skills/machhub-* ~/.cursor/skills/
```

Structure:
```
~/.cursor/skills/
├── machhub-sdk-initialization/
│   └── SKILL.md
├── machhub-angular/
│   └── SKILL.md
└── ...
```

**3. Verify skills are loaded:**

No configuration needed! Cursor automatically discovers skills in:
- `.cursor/skills/` (project-level)
- `.claude/skills/` (project-level, Claude compatibility)
- `.codex/skills/` (project-level, Codex compatibility)
- `~/.cursor/skills/` (user-level, global)
- `~/.claude/skills/` (user-level, Claude compatibility)
- `~/.codex/skills/` (user-level, Codex compatibility)

**View discovered skills:**
1. Open Cursor Settings (`Cmd+Shift+J` on Mac, `Ctrl+Shift+J` on Windows/Linux)
2. Navigate to "Rules"
3. Skills appear in the "Agent Decides" section

**Using skills in chat:**
- Type `/` in Agent chat to see available skills
- Skills are automatically applied when relevant
- Or explicitly invoke: `/machhub-sdk-initialization`

**Optional: Install directly from GitHub**

Instead of manual copying, you can import from GitHub:
1. Open Cursor Settings → Rules
2. Click "Add Rule" in Project Rules section
3. Select "Remote Rule (Github)"
4. Enter: `https://github.com/machhub-dev/skills`

For more details, see [Cursor's Agent Skills documentation](https://cursor.com/en-US/docs/context/skills).

---

### Quick Verification Test

**In VSCode or Cursor, ask:**
```
"Initialize MACHHUB SDK in my Angular project using zero-config"
```

**Expected response should:**
- Reference `machhub-sdk-initialization` skill
- Reference `machhub-angular` skill
- Copy code from `machhub-angular/templates/sdk.service.ts`
- Mention Designer Extension as the initialization method

---

## �📚 Skills Overview

### Core SDK Skills (7 skills + 33 templates)

Complete framework-agnostic guides for MACHHUB TypeScript SDK:

| Skill Name                   | Description                                                         | Templates |
| ---------------------------- | ------------------------------------------------------------------- | --------- |
| `machhub-sdk-initialization` | SDK setup with Designer Extension (zero-config) and manual config   | 4         |
| `machhub-sdk-architecture`   | Service layer patterns, BaseService, and project structure          | 4         |
| `machhub-sdk-collections`    | CRUD operations, RecordID handling, queries, and relationships      | 4         |
| `machhub-sdk-authentication` | Login, permissions, user management, and JWT validation             | 4         |
| `machhub-sdk-realtime`       | Tag subscriptions, MQTT messaging, and IoT data streaming           | 3         |
| `machhub-sdk-file-handling`  | File upload, download, and Blob handling for collection file fields | 3         |
| `machhub-sdk-advanced`       | Historian queries, remote functions, caching, and time-series data  | 4         |

### Framework-Specific Skills (4 skills + 24 templates)

Integration guides and templates for popular frameworks:

| Skill Name                 | Description                                                 | Templates |
| -------------------------- | ----------------------------------------------------------- | --------- |
| `machhub-angular`          | Angular integration with DI, RxJS, Signals, and guards      | 6         |
| `machhub-nextjs-react`     | Next.js 14+ App Router with React hooks and Context API     | 7         |
| `machhub-nuxt-vue`         | Nuxt 3 with Vue 3 Composition API, composables, and plugins | 7         |
| `machhub-sveltekit-svelte` | SvelteKit with Svelte 5 runes, stores, and load functions   | 7         |

### Additional Skills

| Skill Name                | Description                                                  |
| ------------------------- | ------------------------------------------------------------ |
| `machhub-collection-json` | Collection JSON schema generation with relations and indexes |

**Total: 12 skills with 57 production-ready templates**

---

## 🎯 Zero-Configuration First

All skills prioritize **MACHHUB Designer Extension** for automatic zero-config initialization:

✅ **Default Approach (Development)**
- Install Designer Extension in VSCode
- No configuration files needed
- Auto-detects MACHHUB server
- Perfect for rapid development

⚙️ **Manual Configuration (Production)**
- Environment variables
- Explicit connection parameters
- For deployments and CI/CD
- See each skill's manual config templates

---

## 📁 Templates Structure

Each skill includes separate template files (not embedded in docs):

```
machhub-[skill-name]/templates/
  *.ts, *.tsx, *.vue, *.svelte  # Production-ready code
  README.md                      # Usage guide
```

See [TEMPLATES_OVERVIEW.md](TEMPLATES_OVERVIEW.md) for the complete template catalog.

---

## 📖 Usage Examples

### Angular
```typescript
// Copy templates/sdk.service.ts
@Injectable({ providedIn: 'root' })
export class ProductService {
  constructor(private sdkService: SDKService) {}
  
  async getProducts() {
    const sdk = this.sdkService.getSDK();
    return await sdk.collection('products').getAll();
  }
}
```

### React/Next.js
```tsx
// Copy templates/sdk-context.tsx
function Products() {
  const { items, loading, getAll } = useCollection('products');
  useEffect(() => { getAll(); }, []);
  return <div>{items.map(p => <div key={p.id}>{p.name}</div>)}</div>;
}
```

### Vue/Nuxt
```vue
<script setup>
const { items, loading, getAll } = useCollection('products');
onMounted(() => getAll());
</script>
```

### Svelte/SvelteKit
```svelte
<script lang="ts">
const store = createCollectionStore('products');
onMount(() => store.getAll());
</script>
{#if store.loading}...{/if}
```

---

## 🛠️ Development Workflow

1. **Choose Your Framework** - Select the appropriate skill
2. **Install Prerequisites** - `npm install @machhub-dev/sdk-ts`
3. **Copy Templates** - Browse skill's `templates/` directory
4. **Install Designer Extension** - For zero-config initialization
5. **Start Coding** - No configuration needed!

For production, use manual config templates and set environment variables.

---

## 📂 Repository Structure

```
skills/
├── README.md                      # This file
├── TEMPLATES_OVERVIEW.md          # Complete template catalog
├── machhub-collection-json/       # Collection JSON schema
├── machhub-sdk-initialization/    # SDK setup (4 templates)
├── machhub-sdk-architecture/      # Service patterns (4 templates)
├── machhub-sdk-collections/       # CRUD operations (4 templates)
├── machhub-sdk-authentication/    # Auth & permissions (4 templates)
├── machhub-sdk-realtime/          # Real-time (3 templates)
├── machhub-sdk-file-handling/     # File operations (3 templates)
├── machhub-sdk-advanced/          # Advanced features (4 templates)
├── machhub-angular/               # Angular integration (6 templates)
├── machhub-nextjs-react/          # Next.js + React (7 templates)
├── machhub-nuxt-vue/              # Nuxt + Vue (7 templates)
└── machhub-sveltekit-svelte/      # SvelteKit + Svelte (7 templates)
```

---

## 🎓 Learning Path

1. **Start**: `machhub-sdk-initialization` - Zero-config setup
2. **Core**: `machhub-sdk-architecture` - Service patterns
3. **Data**: `machhub-sdk-collections` - CRUD operations
4. **Auth**: `machhub-sdk-authentication` - User management
5. **Real-time**: `machhub-sdk-realtime` - Live updates
6. **Advanced**: File handling, Historian, caching
7. **Framework**: Choose your framework skill

---

## 🔄 Recent Updates (v2.0 - February 2026)

- ✅ All skills now framework-agnostic
- ✅ Added explicit SPA deployment support
- ✅ Created 4 framework-specific skills
- ✅ Separated 57 templates into standalone files
- ✅ Emphasized Designer Extension (zero-config) as default
- ✅ Added comprehensive template documentation

---

## 🤝 Contribution

Contributions welcome from MACHHUB developers:

- Submit PRs for bug fixes, improvements, or new skills
- Ensure alignment with MACHHUB best practices
- Include proper documentation and examples
- Test templates with actual MACHHUB projects
- Follow the zero-config first approach

---

## 📄 License

Licensed under the **Mozilla Public License 2.0 (MPL-2.0)**. See [LICENSE](LICENSE) for details.

---

**Built with ❤️ by the MACHHUB team**
