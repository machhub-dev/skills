---
name: machhub-groups-json
description: Simple guide for users and AI on how to fill in the groups.json when importing group (role) assignments on the MACHHUB Permissions page or via the Designer extension. No technical knowledge required.
---

# Filling in `groups.json` — What to Type

A **group** is a role (e.g. *Viewer*, *Editor*). Each group is granted a list of **features**, and every feature is pinned to one **action** and one **scope**. This file lives at `_permissions/groups.json` and is uploaded from the **Permissions** panel in the Designer extension (or pasted into the Import box on the Permissions page).

> This is the *assignment* layer. The *catalogue* of which features/actions/scopes exist is a separate file — see [machhub-permission-json](../machhub-permission-json/SKILL.md).

Here is what the JSON should look like:

```json
{
  "scope": "gemtex",
  "note": "Group assignments for the Gemtex domain",
  "groups": [
    {
      "name": "Viewer",
      "features": [
        { "name": "inbound.purchase_orders", "action": "read", "scope": "gemtex" },
        { "name": "inbound.delivery_orders", "action": "read", "scope": "gemtex" }
      ]
    },
    {
      "name": "Editor",
      "features": [
        { "name": "inbound.purchase_orders", "action": "read", "scope": "gemtex" },
        { "name": "inbound.purchase_orders", "action": "update", "scope": "gemtex" }
      ]
    }
  ]
}
```

---

## Top-level fields

| Field | What to put | Required? |
|---|---|---|
| `scope` | The domain/tenant label this document is for | Optional |
| `note` | A plain-English comment describing this set of assignments | Optional |
| `groups` | The list of groups (roles) and their features | **Required** |

**Note:** `scope` and `note` are treated as comments — they are **ignored when the extension checks for changes**. Editing the `note` will *not* mark the file as "modified". Only changes to the `groups` list count.

---

## `groups` — what to fill in

Each item in the `groups` array is one group (role).

| Field | What to put | Example |
|---|---|---|
| `name` | The group / role name | `"Viewer"` |
| `features` | The list of things this group is allowed to do | see below |

**Rules:**
- `name` must be unique. If a group with this name already exists it will be **updated**; if it doesn't exist it will be **created**.
- `"Superuser"` is **reserved** and will be rejected — do not use it as a group name.

---

## `features` — what each grant looks like

Every entry in a group's `features` array is a single grant: one feature + one action + one scope.

| Field | What to put | Example |
|---|---|---|
| `name` | The feature name (must match a feature from the permissions catalogue) | `"inbound.purchase_orders"` |
| `action` | The action being granted | `"read"`, `"update"`, `"create"`, `"delete"` |
| `scope` | The scope the grant applies to | `"gemtex"`, `"self"`, `"team"` |

To give a group **multiple actions** on the same feature, add one entry per action:

```json
"features": [
  { "name": "inbound.purchase_orders", "action": "read",   "scope": "gemtex" },
  { "name": "inbound.purchase_orders", "action": "update", "scope": "gemtex" }
]
```

---

## Minimal example

```json
{
  "groups": [
    {
      "name": "Viewer",
      "features": [
        { "name": "dashboard", "action": "view", "scope": "company" }
      ]
    }
  ]
}
```

---

## What the import does

- **Creates** any group that does not exist yet.
- **Updates** an existing group when the `name` matches.
- **Never deletes** anything — it is safe to run multiple times.
- `"Superuser"` is rejected.

---

## Using it from the Designer extension

1. Put the file at `_permissions/groups.json`.
2. Open the **Permissions** panel — `groups.json` appears next to `permissions.json` with a colored status dot (synced / modified / new / server-only).
3. Right-click it:
   - **Upload to Server** — push your local assignments.
   - **Download from Server** — pull the server's assignments.
   - **Compare JSON with Server** — side-by-side diff of local vs server (metadata ignored).

The panel's title-bar **Upload** / **Download** buttons sync *both* `permissions.json` and `groups.json` together.
