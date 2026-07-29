# Centralized Admin Media Library

The Admin CMS uses one R2-backed Media Library for managed images and PDF documents. Existing content fields continue to store generated public URLs, while product galleries and menu images continue to use their existing `media_assets` relationships.

## Supported files

- JPG and JPEG
- PNG
- WEBP
- SVG without scripts, inline event handlers, or JavaScript URLs
- PDF
- Maximum file size: 12 MB

Raster JPG and PNG uploads are optimized to WEBP in the browser. Images also receive a separate 480px WEBP thumbnail. Original SVG, WEBP, and PDF files retain their original format.

## Folders

`products`, `categories`, `banners`, `cms`, `homepage`, `blog`, `seo`, and `general`

Folders are organizational metadata. Changing a folder does not change the public URL or R2 key, so existing references remain valid.

## API

- `GET /api/admin/media-library` — paginated search, filtering, and sorting
- `POST /api/admin/uploads` — upload through the shared R2 path
- `PATCH /api/admin/media/:id` — update folder and alt text
- `PUT /api/admin/media/:id/replace` — replace content while preserving the URL and R2 key
- `GET /api/admin/media/:id/usage` — inspect reference counts and locations
- `GET /api/admin/media/:id/download` — authenticated download
- `DELETE /api/admin/media/:id` — safe delete; returns HTTP 409 when referenced

All endpoints are behind the existing ADMIN/SUPER_ADMIN middleware. Authentication and routing were not changed.

## Database migration

Apply `0012_central_media_library.sql` before deploying the Worker:

```powershell
cd worker
npx wrangler d1 migrations apply DB --remote
```

The migration adds `thumbnail_key` and `thumbnail_url` to `media_assets`, plus indexes for date, MIME type, and file-name access.

Existing assets remain usable. They will show the original asset as their thumbnail until replaced. Replacing an existing image generates its optimized thumbnail and records dimensions.

## Safe-delete coverage

Usage is calculated from:

- Product hero/detail URLs and product gallery relations
- Packaging relations
- Category image fields
- Banners
- Digital content
- CMS entries and CMS version history
- Homepage JSON
- SEO social metadata
- Menu relations
- Settings JSON

An asset with one or more references is not removed from R2 or D1.

## Integration behavior

- Single-image fields store the selected asset's public URL in the existing column.
- Product galleries store existing `media_assets` IDs in `product_media`.
- Menu images store the selected `media_assets` ID in `menu_items.media_id`.
- Structured CMS/Homepage/SEO JSON editors insert a selected generated URL at the current cursor.
- Selecting an existing asset never uploads or duplicates it.

## Manual testing checklist

- Sign in as ADMIN and SUPER_ADMIN; confirm Media Library access.
- Sign in as CUSTOMER; confirm `/admin` remains inaccessible.
- Drag multiple supported files into the upload zone and use Browse Files.
- Reject unsupported file types, files over 12 MB, spoofed file signatures, and active SVG content.
- Verify dimensions, thumbnail, size, MIME type, uploader, timestamp, alt text, folder, URL, key, and usage count.
- Search by file name and alt text; filter by folder/type; test every sort option.
- Switch grid/list views and confirm lazy loading and infinite scroll.
- Preview, organize, update alt text, download, copy URL, and replace an asset.
- Confirm replacement keeps the exact same public URL and refreshes its thumbnail.
- Attempt to delete a referenced asset; confirm the usage-count message and that R2/D1 data remains.
- Delete an unreferenced asset; confirm both original and thumbnail objects are removed.
- Select an existing asset in every integrated module and confirm no duplicate media row is created.
- Upload through Media Picker and confirm the new asset appears immediately and can be selected.
- Save product hero/detail/gallery, category, banner, digital, homepage, CMS/blog, menu, and SEO social image changes.
- Test keyboard shortcut Ctrl/Cmd+U and Escape, mobile layouts, and keyboard focus.
