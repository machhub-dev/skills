---
name: machhub-sdk-file-handling
description: File upload, retrieval, and Blob handling for MACHHUB SDK collection file fields.
related_skills: [machhub-sdk-collections, machhub-sdk-architecture]
---

## Overview

This skill covers **file handling** in the MACHHUB SDK, including uploading files to collection fields and retrieving them as Blobs.

**Use this skill when:**
- Uploading files (images, documents, attachments)
- Retrieving files from collection records
- Displaying images or files in UI
- Working with file-type fields in collections

**Prerequisites:**
- SDK initialized using **Designer Extension (zero-config recommended)** - see `machhub-sdk-initialization`
- For production: Manual configuration - see `machhub-sdk-initialization` templates
- Collections understanding (see `machhub-sdk-collections`)

**Related Skills:**
- `machhub-sdk-collections` - File fields are part of collections
- `machhub-sdk-architecture` - Use service pattern for file operations

---

## File Field Type

In MACHHUB collections, use `file` field type for file storage:

```typescript
// Collection schema
{
  name: 'products',
  fields: [
    { name: 'image', type: 'file' },
    { name: 'manual', type: 'file' },
    { name: 'attachments', type: 'file' }
  ]
}
```

---

## Uploading Files

### Basic File Upload

```typescript
import { getOrInitializeSDK } from './sdk.service';

const sdk = await getOrInitializeSDK();

// Create record with file
const file: File = // ... from input element
await sdk.collection('products').create({
  name: 'Product Name',
  image: file  // Pass File object directly
});
```

### Update with File (PATCH)

```typescript
import { RecordIDToString } from '@machhub-dev/sdk-ts';

// Update only the image field
const updatedProduct = await sdk.collection('products').update(
  'myapp.products:PROD-001',
  {
    image: file  // ✅ Pass File object, only this field updates
  }
);
```

### Multiple Files

```typescript
// Create with multiple file fields
await sdk.collection('documents').create({
  title: 'Report',
  coverImage: imageFile,
  pdfDocument: pdfFile,
  attachments: zipFile
});
```

---

## Retrieving Files

### Understanding File Field Response

When you retrieve a record, file fields return as **filename strings**:

```typescript
const product = await sdk.collection('products')
  .getOne('myapp.products:PROD-001');

console.log(product.image); // "photo_12345.jpg" (string)
```

### Get File as Blob

```typescript
const sdk = await getOrInitializeSDK();
const collection = sdk.collection('products');

// Get the record first
const product = await collection.getOne('myapp.products:PROD-001');

if (product.image) {
  // Get the actual file as Blob
  const imageBlob = await collection.getFile(
    product.image,    // fileName (string from API response)
    'image'           // fieldName in collection
  );

  // Create object URL for display
  const imageUrl = URL.createObjectURL(imageBlob);
  
  // Use in img tag
  // <img src={imageUrl} alt="Product" />
  
  // Remember to revoke when done
  URL.revokeObjectURL(imageUrl);
}
```

---

## File Service Example

```typescript
// services/file.service.ts
import { getOrInitializeSDK } from './sdk.service';
import { RecordIDToString } from '@machhub-dev/sdk-ts';

class FileService {
  /**
   * Upload file to record
   */
  async uploadFile(
    collectionName: string,
    recordId: string,
    fieldName: string,
    file: File
  ): Promise<any> {
    try {
      const sdk = await getOrInitializeSDK();
      
      // Extract clean ID if needed
      const cleanId = this.extractId(recordId);
      const fullId = `myapp.${collectionName}:${cleanId}`;
      
      // Update with file (PATCH - only updates this field)
      return await sdk.collection(collectionName).update(fullId, {
        [fieldName]: file
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Get file as Blob
   */
  async getFile(
    collectionName: string,
    fileName: string,
    fieldName: string
  ): Promise<Blob | null> {
    if (!fileName) return null;

    try {
      const sdk = await getOrInitializeSDK();
      const collection = sdk.collection(collectionName);
      
      return await collection.getFile(fileName, fieldName);
    } catch (error) {
      console.error('Error retrieving file:', error);
      throw error;
    }
  }

  /**
   * Get file as object URL (for display)
   */
  async getFileUrl(
    collectionName: string,
    fileName: string,
    fieldName: string
  ): Promise<string | null> {
    try {
      const blob = await this.getFile(collectionName, fileName, fieldName);
      if (!blob) return null;
      
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error creating file URL:', error);
      return null;
    }
  }

  /**
   * Download file
   */
  async downloadFile(
    collectionName: string,
    fileName: string,
    fieldName: string,
    downloadName?: string
  ): Promise<void> {
    try {
      const blob = await this.getFile(collectionName, fileName, fieldName);
      if (!blob) throw new Error('File not found');

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadName || fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  private extractId(value: any): string {
    if (typeof value === 'object' && value?.ID) {
      value = value.ID;
    }
    if (typeof value === 'string' && value.includes(':')) {
      return value.split(':')[1];
    }
    return value;
  }
}

export const fileService = new FileService();
```

---

## Domain Service with Files

```typescript
// services/product.service.ts
import { BaseService } from './base.service';
import { fileService } from './file.service';

export interface Product {
  id: string;
  name: string;
  image?: string;  // Filename string
  manual?: string; // Filename string
}

class ProductService extends BaseService {
  private collectionName = 'products';

  async getProductImage(product: Product): Promise<string | null> {
    if (!product.image) return null;
    
    return await fileService.getFileUrl(
      this.collectionName,
      product.image,
      'image'
    );
  }

  async updateProductImage(
    productId: string,
    imageFile: File
  ): Promise<Product> {
    return await fileService.uploadFile(
      this.collectionName,
      productId,
      'image',
      imageFile
    );
  }

  async downloadProductManual(product: Product): Promise<void> {
    if (!product.manual) {
      throw new Error('No manual available');
    }

    await fileService.downloadFile(
      this.collectionName,
      product.manual,
      'manual',
      `${product.name}_manual.pdf`
    );
  }
}

export const productService = new ProductService();
```

---

## Component Usage

### File Upload Example

```typescript
// file-upload.ts
import { productService } from './services';

let uploading = false;

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  
  if (!file) return;

  try {
    uploading = true;
    const updated = await productService.updateProductImage(
      product.id,
      file
    );
    product = updated;
    console.log('Upload successful');
    // Show success message in UI
  } catch (error) {
    console.error('Upload failed:', error);
    // Show error message in UI
  } finally {
    uploading = false;
  }
}

// HTML:
// <input type="file" accept="image/*" onchange="handleFileSelect(event)" />
```

### File Display Example

```typescript
// file-display.ts
import { productService } from './services';

let imageUrl: string | null = null;

async function loadProductImage(product: any) {
  if (product.image) {
    imageUrl = await productService.getProductImage(product);
    // Update img element: document.getElementById('productImage').src = imageUrl;
  }
}

// Clean up object URL when done
function cleanupImage() {
  if (imageUrl) {
    URL.revokeObjectURL(imageUrl);
    imageUrl = null;
  }
}

// Call on page load
loadProductImage(product);

// Call on page unload
window.addEventListener('beforeunload', cleanupImage);

// HTML:
// <img id="productImage" alt="Product" />
```

---

## Common Patterns

### Pattern: Image Upload with Preview

```typescript
let previewUrl: string | null = null;

function handleFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  // Create preview
  previewUrl = URL.createObjectURL(file);

  // Upload
  uploadFile(file);
}

// Remember to revoke when done (call on cleanup)
function cleanup() {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }
}
```

### Pattern: Drag and Drop Upload

```typescript
function handleDrop(event: DragEvent) {
  event.preventDefault();
  const file = event.dataTransfer?.files[0];
  if (file) {
    uploadFile(file);
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
}
```

### Pattern: Multiple File Upload

```typescript
async function uploadMultipleFiles(files: FileList) {
  const results = [];
  
  for (const file of Array.from(files)) {
    try {
      const result = await fileService.uploadFile(
        'documents',
        docId,
        'attachments',
        file
      );
      results.push({ success: true, file: file.name });
    } catch (error) {
      results.push({ success: false, file: file.name, error });
    }
  }
  
  return results;
}
```

---

## File Validation

```typescript
function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size (e.g., max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'File too large (max 5MB)' };
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type' };
  }

  return { valid: true };
}

async function handleFileUpload(file: File) {
  const validation = validateFile(file);
  if (!validation.valid) {
    alert(validation.error);
    return;
  }

  await uploadFile(file);
}
```

---

## Error Handling

```typescript
async function uploadFile(file: File) {
  try {
    await fileService.uploadFile('products', productId, 'image', file);
    toast.success('File uploaded successfully');
  } catch (error: any) {
    if (error.status === 413) {
      toast.error('File too large');
    } else if (error.status === 415) {
      toast.error('Unsupported file type');
    } else {
      toast.error('Upload failed');
    }
  }
}
```

---

## Templates

### Template 1: File Upload Service

**File:** `src/services/file-upload.service.ts`

**Purpose:** Complete file upload service with validation and progress

**Code:**

```typescript
// filepath: src/services/file-upload.service.ts
import { getOrInitializeSDK } from './sdk.service';
import type { SDK } from '@machhub-dev/sdk-ts';

export interface UploadOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  onProgress?: (progress: number) => void;
}

export interface FileMetadata {
  id: string;
  filename: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: Date;
}

class FileUploadService {
  private sdk: SDK | null = null;
  private defaultMaxSize = 10 * 1024 * 1024; // 10MB

  private async getSDK(): Promise<SDK> {
    if (!this.sdk) {
      this.sdk = await getOrInitializeSDK();
    }
    return this.sdk;
  }

  /**
   * Upload file with validation
   */
  async uploadFile(
    collectionName: string,
    recordId: string,
    fieldName: string,
    file: File,
    options: UploadOptions = {}
  ): Promise<FileMetadata> {
    try {
      // Validate file
      this.validateFile(file, options);

      const sdk = await this.getSDK();
      const fullId = `myapp.${collectionName}:${recordId}`;

      // Upload file
      const result = await sdk.collection(collectionName).uploadFile(
        fullId,
        fieldName,
        file
      );

      // Get file URL
      const url = sdk.collection(collectionName).getFileURL(fullId, fieldName);

      return {
        id: result.id || recordId,
        filename: file.name,
        size: file.size,
        type: file.type,
        url,
        uploadedAt: new Date()
      };
    } catch (error: any) {
      console.error('File upload failed:', error);
      throw new Error(error.message || 'File upload failed');
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultiple(
    collectionName: string,
    recordId: string,
    files: Array<{ fieldName: string; file: File }>,
    options: UploadOptions = {}
  ): Promise<FileMetadata[]> {
    const results: FileMetadata[] = [];

    for (const { fieldName, file } of files) {
      try {
        const result = await this.uploadFile(
          collectionName,
          recordId,
          fieldName,
          file,
          options
        );
        results.push(result);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        // Continue with other files
      }
    }

    return results;
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: File, options: UploadOptions): void {
    const maxSize = options.maxSize || this.defaultMaxSize;

    // Check file size
    if (file.size > maxSize) {
      throw new Error(
        `File size exceeds maximum allowed size (${this.formatBytes(maxSize)})`
      );
    }

    // Check file type
    if (options.allowedTypes && options.allowedTypes.length > 0) {
      const fileType = file.type;
      const isAllowed = options.allowedTypes.some(type => {
        // Support wildcards like "image/*"
        if (type.endsWith('/*')) {
          const prefix = type.slice(0, -2);
          return fileType.startsWith(prefix);
        }
        return fileType === type;
      });

      if (!isAllowed) {
        throw new Error(
          `File type "${fileType}" is not allowed. Allowed types: ${options.allowedTypes.join(', ')}`
        );
      }
    }
  }

  /**
   * Get file as Blob
   */
  async getFile(
    collectionName: string,
    recordId: string,
    fieldName: string
  ): Promise<Blob> {
    try {
      const sdk = await this.getSDK();
      const fullId = `myapp.${collectionName}:${recordId}`;
      
      return await sdk.collection(collectionName).getFile(fullId, fieldName);
    } catch (error) {
      console.error('Failed to get file:', error);
      throw error;
    }
  }

  /**
   * Get file URL
   */
  getFileURL(
    collectionName: string,
    recordId: string,
    fieldName: string
  ): string {
    try {
      const sdk = this.sdk;
      if (!sdk) {
        throw new Error('SDK not initialized');
      }

      const fullId = `myapp.${collectionName}:${recordId}`;
      return sdk.collection(collectionName).getFileURL(fullId, fieldName);
    } catch (error) {
      console.error('Failed to get file URL:', error);
      throw error;
    }
  }

  /**
   * Delete file
   */
  async deleteFile(
    collectionName: string,
    recordId: string,
    fieldName: string
  ): Promise<void> {
    try {
      const sdk = await this.getSDK();
      const fullId = `myapp.${collectionName}:${recordId}`;
      
      await sdk.collection(collectionName).deleteFile(fullId, fieldName);
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }

  /**
   * Create object URL from Blob
   */
  createObjectURL(blob: Blob): string {
    return URL.createObjectURL(blob);
  }

  /**
   * Revoke object URL
   */
  revokeObjectURL(url: string): void {
    URL.revokeObjectURL(url);
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

export const fileUploadService = new FileUploadService();
```

**Usage:**

```typescript
import { fileUploadService } from './services/file-upload.service';

// Upload single file
const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
const file = fileInput.files?.[0];

if (file) {
  const metadata = await fileUploadService.uploadFile(
    'products',
    'prod-123',
    'image',
    file,
    {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/*']
    }
  );

  console.log('Uploaded:', metadata.url);
}

// Get file URL
const url = fileUploadService.getFileURL('products', 'prod-123', 'image');
```

---

### Template 2: Image Gallery Component Logic

**File:** `src/components/image-gallery.ts`

**Purpose:** Logic for managing image gallery with upload/delete

**Code:**

```typescript
// filepath: src/components/image-gallery.ts
import { fileUploadService, type FileMetadata } from '../services/file-upload.service';
import { getOrInitializeSDK } from '../services/sdk.service';

export interface GalleryImage {
  id: string;
  url: string;
  filename: string;
  size: number;
  uploadedAt: Date;
}

export class ImageGallery {
  private collectionName: string;
  private recordId: string;
  private fieldName: string;
  private images: GalleryImage[] = [];
  private objectUrls: Set<string> = new Set();

  constructor(collectionName: string, recordId: string, fieldName: string) {
    this.collectionName = collectionName;
    this.recordId = recordId;
    this.fieldName = fieldName;
  }

  /**
   * Load existing images
   */
  async loadImages(): Promise<GalleryImage[]> {
    try {
      const sdk = await getOrInitializeSDK();
      const fullId = `myapp.${this.collectionName}:${this.recordId}`;
      
      const record = await sdk
        .collection(this.collectionName)
        .getOne(fullId);

      const imageField = record[this.fieldName];
      
      if (Array.isArray(imageField)) {
        this.images = imageField.map((img: any, index: number) => ({
          id: `${this.recordId}-${index}`,
          url: sdk.collection(this.collectionName).getFileURL(
            fullId,
            `${this.fieldName}[${index}]`
          ),
          filename: img.filename || `image-${index}`,
          size: img.size || 0,
          uploadedAt: new Date(img.uploadedAt || Date.now())
        }));
      }

      return this.images;
    } catch (error) {
      console.error('Failed to load images:', error);
      return [];
    }
  }

  /**
   * Upload new image
   */
  async uploadImage(file: File): Promise<GalleryImage> {
    try {
      const metadata = await fileUploadService.uploadFile(
        this.collectionName,
        this.recordId,
        this.fieldName,
        file,
        {
          maxSize: 5 * 1024 * 1024, // 5MB
          allowedTypes: ['image/*']
        }
      );

      const image: GalleryImage = {
        id: metadata.id,
        url: metadata.url,
        filename: metadata.filename,
        size: metadata.size,
        uploadedAt: metadata.uploadedAt
      };

      this.images.push(image);
      return image;
    } catch (error) {
      console.error('Failed to upload image:', error);
      throw error;
    }
  }

  /**
   * Delete image
   */
  async deleteImage(imageId: string): Promise<void> {
    try {
      await fileUploadService.deleteFile(
        this.collectionName,
        this.recordId,
        this.fieldName
      );

      this.images = this.images.filter(img => img.id !== imageId);
    } catch (error) {
      console.error('Failed to delete image:', error);
      throw error;
    }
  }

  /**
   * Get image as blob for preview
   */
  async getImageBlob(imageId: string): Promise<Blob | null> {
    try {
      return await fileUploadService.getFile(
        this.collectionName,
        this.recordId,
        this.fieldName
      );
    } catch (error) {
      console.error('Failed to get image blob:', error);
      return null;
    }
  }

  /**
   * Create preview URL from File object
   */
  createPreviewURL(file: File): string {
    const url = fileUploadService.createObjectURL(file);
    this.objectUrls.add(url);
    return url;
  }

  /**
   * Get all images
   */
  getImages(): GalleryImage[] {
    return [...this.images];
  }

  /**
   * Cleanup object URLs to prevent memory leaks
   */
  cleanup(): void {
    for (const url of this.objectUrls) {
      fileUploadService.revokeObjectURL(url);
    }
    this.objectUrls.clear();
  }
}
```

**Usage:**

```typescript
import { ImageGallery } from './components/image-gallery';

// Initialize gallery
const gallery = new ImageGallery('products', 'prod-123', 'gallery');

// Load existing images
const images = await gallery.loadImages();

// Upload new image
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    const image = await gallery.uploadImage(file);
    console.log('Uploaded:', image);
  }
});

// Delete image
await gallery.deleteImage('image-id');

// Cleanup when component unmounts
gallery.cleanup();
```

---

### Template 3: File Download Helper

**File:** `src/utils/file-download.ts`

**Purpose:** Utilities for downloading files from MACHHUB

**Code:**

```typescript
// filepath: src/utils/file-download.ts
import { fileUploadService } from '../services/file-upload.service';

export class FileDownloadHelper {
  /**
   * Download file from MACHHUB
   */
  static async downloadFile(
    collectionName: string,
    recordId: string,
    fieldName: string,
    filename?: string
  ): Promise<void> {
    try {
      // Get file as Blob
      const blob = await fileUploadService.getFile(
        collectionName,
        recordId,
        fieldName
      );

      // Create temporary URL
      const url = URL.createObjectURL(blob);

      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup URL
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  }

  /**
   * Download file from URL
   */
  static async downloadFromURL(url: string, filename: string): Promise<void> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();

      const objectUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Download from URL failed:', error);
      throw error;
    }
  }

  /**
   * Get file extension from filename
   */
  static getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  /**
   * Get file type from extension
   */
  static getFileType(filename: string): string {
    const ext = this.getFileExtension(filename).toLowerCase();
    
    const typeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      txt: 'text/plain',
      csv: 'text/csv',
      json: 'application/json'
    };

    return typeMap[ext] || 'application/octet-stream';
  }

  /**
   * Check if file is image
   */
  static isImage(filename: string): boolean {
    const ext = this.getFileExtension(filename).toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext);
  }

  /**
   * Check if file is document
   */
  static isDocument(filename: string): boolean {
    const ext = this.getFileExtension(filename).toLowerCase();
    return ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(ext);
  }
}
```

**Usage:**

```typescript
import { FileDownloadHelper } from './utils/file-download';

// Download file
await FileDownloadHelper.downloadFile(
  'products',
  'prod-123',
  'manual',
  'product-manual.pdf'
);

// Download from URL
const url = 'https://example.com/file.pdf';
await FileDownloadHelper.downloadFromURL(url, 'document.pdf');

// Check file type
const isImage = FileDownloadHelper.isImage('photo.jpg'); // true
const isDoc = FileDownloadHelper.isDocument('manual.pdf'); // true
```

---

## File Handling Checklist

- [ ] **Pass File object** when uploading (not filename)
- [ ] **Use getFile()** to retrieve file as Blob
- [ ] **Create object URL** for display in UI
- [ ] **Revoke object URLs** when done (prevent memory leaks)
- [ ] **Validate files** before upload (size, type)
- [ ] **Handle errors** gracefully
- [ ] **Show upload progress** (if needed)
- [ ] **Clean up** on component unmount

---

## Best Practices

1. ✅ **Pass File objects** - Not filenames when uploading
2. ✅ **Use getFile()** - Get Blob for display/download
3. ✅ **Revoke URLs** - Clean up object URLs to prevent memory leaks
4. ✅ **Validate files** - Check size and type before upload
5. ✅ **Error handling** - Handle network and validation errors
6. ✅ **User feedback** - Show upload progress and status
7. ✅ **Service layer** - Use file service, not direct SDK calls

---

## Resources

- **MACHHUB SDK Docs**: https://docs.machhub.dev
- **Collections Guide**: See `machhub-sdk-collections`
- **Architecture Patterns**: See `machhub-sdk-architecture`
