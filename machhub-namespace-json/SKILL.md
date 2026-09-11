---
name: machhub-namespace-json
description: Guide for users and AI on how to fill in a namespace JSON file for the Designer extension's Namespaces panel — the UNS topic tree (folders and tags) and each tag's historian settings. Covers what an upload applies to the running server and what it leaves alone.
---

# Filling in a namespace file — What to Type

A **namespace** is one UNS topic tree. Its root name is the first segment of every topic under it, so a tag at `Plant1/Line1/Temperature` lives in the namespace named `Plant1`.

One file is one namespace, stored at `_namespaces/<name>.json`, and synced from the **Namespaces** panel in the Designer extension.

> **The file is the tree plus historization, and an upload applies both to the running server** — not just to the stored record. Read [What an upload does](#what-an-upload-does) before you push one.

Here is what the JSON should look like:

```json
{
  "name": "Plant1",
  "type": "custom",
  "description": "Line-side instrumentation",
  "access": "R",
  "historize": {
    "on": false,
    "type": "",
    "retention_period": "",
    "sampling_time": "",
    "deadband_mode": "",
    "deadband_value": 0
  },
  "children": [
    {
      "name": "Line1",
      "description": "",
      "access": "R",
      "tag": false,
      "historize": { "on": false, "type": "", "retention_period": "", "sampling_time": "", "deadband_mode": "", "deadband_value": 0 },
      "children": [
        {
          "name": "Temperature",
          "description": "Oven probe",
          "access": "R",
          "tag": true,
          "historize": {
            "on": true,
            "type": "timeseries",
            "retention_period": "30_days",
            "sampling_time": "5_second",
            "deadband_mode": "",
            "deadband_value": 0
          },
          "children": []
        }
      ]
    }
  ]
}
```

---

## Top-level fields

The top level *is* the root of the tree — its own settings sit at the top and `children` is everything beneath it.

| Field | What to put | Required? |
|---|---|---|
| `name` | The namespace's root name — the first segment of every topic in it | **Required** |
| `type` | The namespace category: `custom`, `application`, `system`, `nodered`, `downstream` | Optional (`custom` is the normal choice) |
| `description` | A plain-English note about the namespace | Optional |
| `access` | `"R"` or `"RW"` | Optional (defaults to `"R"`) |
| `historize` | The inheritance default for tags added under the root — see [historize](#historize--what-each-tag-records) | Optional |
| `children` | The folders and tags under the root | **Required** (use `[]` for an empty namespace) |

**Rules for `name`:**
- It is the **identity** the server matches the upload against — not the filename. A namespace record has no name of its own, so if you rename `name` inside the file you are describing a *different* namespace, and uploading creates a second one rather than renaming the first.
- It cannot contain `/`, `+` or `#`. A `/` would graft the whole namespace under a second root, and `+`/`#` are MQTT wildcards that would make every subscription built from it match topics it was never meant to.
- To rename an existing namespace, use the rename dialog on the Namespace Manage page. It moves the live wiring; editing the file does not.

---

## `children` — folders and tags

Every entry is one level. The only thing that distinguishes a folder from a tag is the `tag` flag.

| Field | What to put | Example |
|---|---|---|
| `name` | One topic segment — no `/` | `"Line1"` |
| `tag` | `false` for a folder, `true` for a tag | `true` |
| `description` | A plain-English note | `"Oven probe"` |
| `access` | `"R"` (read) or `"RW"` (read/write) | `"R"` |
| `historize` | What this tag records — see below | |
| `children` | Nested levels; `[]` on a tag | `[]` |

**A folder's `historize` is not recorded.** Folders are not historized — a folder's block is the **inheritance default** a newly added tag under it picks up, which is how the namespace editor's bulk-historize affordance behaves. Per-tag blocks are what actually drive the historian.

---

## `historize` — what each tag records

| Field | What to put |
|---|---|
| `on` | `true` to record this tag, `false` to stop |
| `type` | `"event"`, `"timeseries"` or `"deadband"` |
| `retention_period` | How long to keep samples — `"<number>_<unit>"`, unit one of `day(s)`, `week(s)`, `month(s)`, `year(s)`. Blank or `0` means keep forever |
| `sampling_time` | `"<number>_<unit>"`, unit one of `second`, `minute`, `hour` |
| `deadband_mode` | `"percent"` or `"absolute"` — deadband only |
| `deadband_value` | The threshold — deadband only |

**What each type does:**

| Type | Behaviour | `sampling_time` |
|---|---|---|
| `event` | Stores every message published to the tag | Ignored |
| `timeseries` | Samples the tag's current value on a fixed tick | **Required** — the tick interval |
| `deadband` | Stores a sample only once the value moves further than `deadband_value` (percent of, or absolute units from, the last stored value) | Optional max-gap override: force a sample after this long inside the band. `"0_second"` disables it |

A blank `type` is legacy data that predates the field; it is rejected rather than guessed, so re-save such tags with a real type.

**Examples:**

```json
// Record every change, keep a month
{ "on": true, "type": "event", "retention_period": "1_month", "sampling_time": "", "deadband_mode": "", "deadband_value": 0 }

// Sample every 5 seconds, keep a year
{ "on": true, "type": "timeseries", "retention_period": "1_year", "sampling_time": "5_second", "deadband_mode": "", "deadband_value": 0 }

// Store only moves of 2% or more, and at least once a minute
{ "on": true, "type": "deadband", "retention_period": "90_days", "sampling_time": "1_minute", "deadband_mode": "percent", "deadband_value": 2 }

// Stop recording
{ "on": false, "type": "", "retention_period": "", "sampling_time": "", "deadband_mode": "", "deadband_value": 0 }
```

---

## What an upload does

Uploading is a **replace**, and it reaches the running server, not only the stored record.

| Change in the file | What happens |
|---|---|
| Namespace not on the server | It is created, with every tag in it historized |
| New folder or tag | Added. A new tag is historized from its own block, or from its parent folder's block when the folder has historization on |
| A tag's `historize` edited — on, off, type, sampling, retention or deadband | The live historian subscription is **started, stopped or re-subscribed immediately**. No restart needed |
| A folder or tag removed from the file | Removed from the namespace, and its historian, auto-discovery and downstream-binding subscriptions are torn down |
| A tag changed into a folder, or a folder into a tag | Treated as removing the old one and adding the new one |

**What an upload does *not* touch** — these are not in the file, and are preserved from whatever the server already has at the matching topic:

- tag bindings to a downstream namespace
- data-source bindings (Modbus / FINS / MC / …)
- forwarding rules and related flows
- auto-discovery (a transient "listen for a while and add what publishes" action with a self-cancelling timer — not something a checked-in file should re-trigger on every deploy)

---

## Things that bite

❌ **Removing a tag to "tidy up" the file.** The tag is deleted from the namespace. Its recorded history is not deleted immediately, but the retention job sweeps history for topics that no longer exist once they have been quiet for a week. Download first, edit, then upload — don't hand-write a partial file over a populated namespace.

❌ **Uploading a stale file.** A file downloaded before someone added tags in the UI will delete those tags on upload. Use **Compare JSON with Server** first; the panel's status dot also flags a file that differs.

❌ **Renaming `name` in the file to rename the namespace.** That creates a second namespace. Use the rename dialog.

❌ **Two files declaring the same `name`.** They are the same namespace to the server, so neither is uploaded — the panel reports the conflict instead of letting one silently win.

❌ **Expecting references to follow.** Dashboards, flows, databridge routes and integration mappings that point at a topic you removed or renamed are **not** rewritten. Fix them yourself.

⚠️ **The historian is licensed by tag count.** A bulk upload turning historization on for many tags can hit the cap partway through. The tree is stored before historization is applied, so this comes back as a *warning* on an otherwise successful upload — read the notification, don't assume the count means everything is recording.

⚠️ **Root names are not unique across domains.** If another domain's namespace shares your root name, historization is skipped and reported rather than written into their record. Rename one of them.

---

## Using it from the Designer extension

1. Put the file at `_namespaces/<name>.json`. The filename is yours to choose — the `name` field inside is the identity — but keeping them the same avoids confusion.
2. Open the **Namespaces** panel. Each namespace appears with its folder/tag counts and a colored status dot (synced / modified / new / server-only).
3. Right-click it:
   - **Upload to Server** — push the local tree and historization.
   - **Download from Server** — pull the server's copy into the file.
   - **Compare JSON with Server** — side-by-side diff of local vs server.
   - **Delete Namespace** — remove it from the server *and* from disk.
4. The panel's title-bar **Upload** / **Download** buttons do the same for every file in `_namespaces/`.

The easiest safe workflow is **Download → edit → Compare → Upload**.

---

## Related skills

- `machhub-collection-json` — collection schemas, synced from the **Collections** panel
- `machhub-permission-json` / `machhub-groups-json` — the permission catalogue and group assignments, synced from the **Permissions** panel
- `machhub-sdk-realtime` — subscribing to these tags from application code
