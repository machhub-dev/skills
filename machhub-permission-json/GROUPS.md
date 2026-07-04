---
name: machhub-group-permissions-json
description: Simple guide for users and AI on how to fill in the JSON when importing or exporting group permissions on the MACHHUB Groups page. Assigns existing features/scopes/actions to groups. No technical knowledge required.
---

# Importing & Exporting Group Permissions — What to Type

On the **Groups page**, admins can **Export** every group's permissions to JSON and
**Import** them back — onto the same domain, or a different domain/environment. This
saves you from re-selecting every permission by hand for each group.

> This is the companion to [`SKILL.md`](./SKILL.md). That one manages the *catalogue*
> (features, scopes) on the **Permissions page**. This one assigns those permissions to
> **groups** on the **Groups page**.

---

## The JSON format

Click **Import** on the Groups page and paste a JSON object shaped like this:

```json
{
  "groups": [
    {
      "name": "Engineering",
      "permissions": [
        { "name": "groups", "action": "read", "scope": "domain" },
        { "name": "operator_panel", "action": "view", "scope": "machines" },
        { "name": "operator_panel", "action": "start", "scope": "machines" }
      ]
    },
    {
      "name": "Operations",
      "permissions": [
        { "name": "dashboard", "action": "read", "scope": "domain" }
      ]
    }
  ]
}
```

| Field | What to put | Example |
|---|---|---|
| `groups` | A list of groups to create or update | — |
| `groups[].name` | The group name. Matches an existing group, or creates a new one | `"Engineering"` |
| `groups[].permissions` | The list of permissions the group should have | — |
| `permissions[].name` | The feature/permission name (system or user-defined) | `"operator_panel"` |
| `permissions[].action` | What the group can do for that feature | `"read"`, `"view"`, `"start"` |
| `permissions[].scope` | Where the permission applies | `"domain"`, `"all"`, `"machines"` |

Each `{ name, action, scope }` row is **one** granted permission. To grant several
actions or several scopes for the same feature, add one row per combination.

---

## Two kinds of permissions

**System permissions** (built into MACHHUB):
- `name` is a fixed system feature such as `groups`, `users`, `dashboard`, `historian`,
  `collections`, `flows`, `namespace`, `upstreams`, `applications`, `logs`, `license`,
  `gateway`, `integration`, `general_settings`.
- `action` is one of `read` or `read-write`.
- `scope` is `domain` (most features) or `all` (global/MACHHUB-level features).

**User-defined permissions** (created on the Permissions page):
- `name` is one of your custom features (e.g. `operator_panel`).
- `action` is one of that feature's custom actions (e.g. `view`, `start`, `approve`).
- `scope` is one of your domain scopes (e.g. `machines`, `self`, `company`).

> Only granted permissions are listed. Anything you leave out means **no access** — you
> don't need `nil`/"no access" rows.

---

## What the import does

- **Matches groups by `name`.**
  - Name exists → the group's permissions are **fully replaced** with the ones in the JSON.
  - Name is new → a **new group is created** with those permissions.
- **Replace, not merge.** Whatever a group's `permissions` list contains becomes its
  *entire* permission set. To keep a permission, keep it in the list.
- **Safe to run multiple times.** Re-importing the same JSON leaves groups in the same
  state (it is idempotent / an upsert).
- **Never deletes groups.** A group that exists but isn't in the JSON is left untouched.

### Requirements — features/scopes/actions must already exist

Import **only assigns** permissions; it does not create features, scopes, or actions.
Every `name`, `action`, and `scope` a group references must already exist in the target
domain. If something is missing, that single row is **skipped** and a warning is shown —
the rest of the import still succeeds.

**So when copying to a fresh domain, import in this order:**
1. **Permissions page → Import** the features and scopes (see [`SKILL.md`](./SKILL.md)).
2. **Groups page → Import** this group-permissions JSON.

### Reserved names

- `Superuser` is never modified (skipped).
- `Member` cannot be created via import (an existing `Member` group can still be updated).

---

## Minimal example (one group, system permissions only)

```json
{
  "groups": [
    {
      "name": "Viewers",
      "permissions": [
        { "name": "dashboard", "action": "read", "scope": "domain" },
        { "name": "historian", "action": "read", "scope": "domain" }
      ]
    }
  ]
}
```

## Removing all permissions from a group

Give it an empty `permissions` list — Replace mode clears everything:

```json
{
  "groups": [
    { "name": "Contractors", "permissions": [] }
  ]
}
```
