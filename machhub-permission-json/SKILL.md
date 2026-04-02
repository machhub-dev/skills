---
name: machhub-permission-json
description: Simple guide for users and AI on how to fill in the JSON when importing permission setups (features and scopes) on the MACHHUB Permissions page. No technical knowledge required.
---

# Importing Permissions — What to Type

On the **Permissions page**, click the **Import** button and paste a JSON object into the editor. Here is what the JSON should look like:

```json
{
  "features": [
    {
      "name": "operator_panel",
      "description": "Access control for the operator panel",
      "actions": ["view", "create", "update", "delete"]
    },
    {
      "name": "reporting",
      "description": "Access control for reports",
      "actions": ["view", "export"]
    }
  ],
  "scopes": [
    "company",
    "self",
    "team"
  ]
}
```

---

## `features` — what to fill in

Each item in the `features` array represents one permission group.

| Field | What to put | Example |
|---|---|---|
| `name` | A short unique identifier, no spaces | `"operator_panel"` |
| `description` | A plain-English explanation *(optional)* | `"Access to the operator panel"` |
| `actions` | A list of things users can do | `["view", "approve", "export"]` |

**Rules:**
- `name` must be unique. If a feature with this name already exists it will be **updated**. If it doesn't exist it will be **created**.
- `actions` can be anything you want — they are your own custom verbs (e.g. `"view"`, `"approve"`, `"export"`, `"configure"`).
- You can omit `description` if you don't need them.

---

## `scopes` — what to fill in

`scopes` is a simple list of scope names (plain strings).

```json
"scopes": ["company", "self", "team"]
```

**Rules:**
- Each value is a short name like `"company"` or `"self"`.
- If a scope with that name already exists it will be skipped — no duplicates will be created.
- You can leave `scopes` out entirely if you only want to import features.

---

## Minimal example (features only)

```json
{
  "features": [
    {
      "name": "dashboard",
      "actions": ["view", "configure"]
    }
  ]
}
```

## Scopes only

```json
{
  "features": [],
  "scopes": ["company", "self"]
}
```

---

## What the import does

- **Creates** any feature or scope that does not exist yet.
- **Updates** an existing feature if the `name` matches.
- **Never deletes** anything — it is safe to run multiple times.
