# MACHHUB SDK File Handling Templates

Templates for file uploads, downloads, and media management.

## Templates

### 1. `file-upload.service.ts`
**Complete file upload service**
- File validation (size, type)
- Single and batch uploads
- Progress tracking support
- Error handling
- File metadata

### 2. `image-gallery.ts`
**Image gallery component logic**
- Load existing images
- Upload new images
- Delete images
- Preview generation
- Memory leak prevention

### 3. `file-download.ts`
**File download utilities**
- Download from MACHHUB
- Download from URL
- File type detection
- Extension helpers
- Browser-compatible downloads

## Usage

### File Upload

```typescript
import { fileUploadService } from './services/file-upload.service';

const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];

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
```

### Image Gallery

```typescript
import { ImageGallery } from './components/image-gallery';

const gallery = new ImageGallery('products', 'prod-123', 'gallery');

// Load images
const images = await gallery.loadImages();

// Upload new image
const image = await gallery.uploadImage(file);

// Cleanup when done
gallery.cleanup();
```

### File Download

```typescript
import { FileDownloadHelper } from './utils/file-download';

// Download file
await FileDownloadHelper.downloadFile(
  'products',
  'prod-123',
  'manual',
  'product-manual.pdf'
);

// Check file type
const isImage = FileDownloadHelper.isImage('photo.jpg');
```

## See Also

- [machhub-sdk-initialization](../machhub-sdk-initialization/) - SDK setup
- [machhub-sdk-collections](../machhub-sdk-collections/) - File metadata storage
