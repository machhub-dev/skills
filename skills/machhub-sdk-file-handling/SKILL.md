---
name: machhub-sdk-file-handling
description: Upload, replace, clear and download files in MACHHUB collection `file` fields with the SDK — single and multiple file fields, getting a file back as a Blob, showing images, and downloads. Use whenever a collection record carries an image, document or attachment.
license: MPL-2.0
metadata:
  related_skills: "machhub-sdk-collections, machhub-collection-json"
---

## How file fields work

- A `file` field is declared in the collection schema as **single** or **multiple** (`fileLinkType`). See `machhub-collection-json`.
- You write files by passing browser `File` objects in `create` / `update`. The SDK sends them as multipart form data.
- On read, the field holds the **filename**: a `string` for single, `string[]` for multiple. The bytes are fetched separately with `getFile`.
- Files are stored on the MACHHUB server under the collection, field, and record. They aren't public URLs; always fetch them through the SDK so the user's auth applies.

---

## Upload

```ts
const sdk = await getSDK(); // see machhub-sdk-initialization

// Single file field
const input = document.querySelector<HTMLInputElement>('#photo')!;
const product = await sdk.collection('products').create({
  name: 'Mouse',
  image: input.files![0]                 // a File
});

// Multiple file field
await sdk.collection('tickets').create({
  title: 'Broken conveyor',
  attachments: Array.from(filesInput.files!) // File[]
});
```

A required file field with no file makes `create` fail.

## Replace, add, clear

`update` is partial, so leaving a file field out keeps its files.

```ts
// Single: replace the file
await sdk.collection('products').update(product.id, { image: newFile });

// Single: remove it (this also deletes the stored file)
await sdk.collection('products').update(product.id, { image: null });

// Multiple: send the FULL list you want. Keep existing names as strings and add new Files
const current: string[] = ticket.attachments ?? [];
await sdk.collection('tickets').update(ticket.id, {
  attachments: [...current.filter((n) => n !== removedName), ...newFiles]
});

// Multiple: remove all of them
await sdk.collection('tickets').update(ticket.id, { attachments: null });
```

Filenames are the uploaded `File.name`, so two uploads with the same name on one record overwrite each other. Rename the file first if that matters (`new File([f], uniqueName, { type: f.type })`).

---

## Download / display

```ts
import { RecordIDToString } from '@machhub-dev/sdk-ts';

const blob: Blob = await sdk.collection('products').getFile(
  product.image,                 // the filename stored in the field
  'image',                       // the field name
  RecordIDToString(product.id)   // the FULL record ID string, e.g. 'plant_a.products:k3j9x'
);
```

- The third argument must be the full `table:id` string. A bare ID fails with `Failed to parse record ID`.
- ⚠️ If the stored file is itself JSON, the SDK returns the **parsed JSON instead of a Blob** (it decides by response content type). Wrap it in `new Blob([JSON.stringify(x)], { type: 'application/json' })` if you need bytes.

**Show an image.** Object URLs must be revoked when they're no longer needed:

```ts
const url = URL.createObjectURL(blob);
img.src = url;
// on component destroy / when the image changes:
URL.revokeObjectURL(url);
```

Cache object URLs per `recordId + filename` when a list shows many thumbnails, instead of fetching on every render.

**Save to disk:**

```ts
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
```

---

## Validation in the UI

The server doesn't restrict type or size for you. Check before uploading:

```ts
const MAX = 10 * 1024 * 1024;
const ok = file.size <= MAX && ['image/png', 'image/jpeg', 'application/pdf'].includes(file.type);
```

Also set `accept="image/*"` (or similar) on the `<input type="file">`.
