# Managing assets

Images, icons, textures, 3D models, and audio live in `public/world-assets/`, and each one is registered in `world/assets/manifest.json` under a stable ID. Configuration and content refer to assets **only by ID**, never by file path. To replace a file, update one manifest entry; every use follows.

## Where files go

```text
public/world-assets/
├── icons/site/favicon.svg
├── images/japan/harbor-dusk.webp
├── models/singapore/marina-tower.glb
├── textures/…
├── thumbnails/…
└── audio/…
```

Paths follow `category/owner/descriptive-name.ext`: lowercase words joined by hyphens.

- Prefer names that say what the file shows: `harbor-dusk.webp`, not `img2.webp`, `final.webp`, or `new-texture.webp`.
- The audit warns about names that look like versions.

## Registering an asset

Add an entry to `world/assets/manifest.json`:

```json
{
  "id": "image.japan.harbor-dusk",
  "type": "image",
  "path": "images/japan/harbor-dusk.webp",
  "displayName": "Japan harbor at dusk",
  "version": 1,
  "status": "active",
  "license": "original",
  "attribution": null,
  "tags": ["japan", "gallery"]
}
```

| `type` | Formats |
|---|---|
| `image` | webp, png, jpg, svg, avif |
| `thumbnail` | webp, png, jpg, avif |
| `icon` | svg, png, ico |
| `texture` | webp, png, jpg, ktx2 |
| `model` | glb, gltf |
| `environment` | hdr, webp, ktx2 |
| `audio` | mp3, ogg, m4a, wav |
| `animation` | glb, json |

Anything not licensed as `original` needs an `attribution`.

## Using an asset

| Where | How |
|---|---|
| Markdown image | `![Alt text](asset:image.japan.harbor-dusk)`. The alt text is also the caption in galleries |
| Markdown link | `[Listen](asset:audio.japan.temple-bells)` |
| Content cover | Front matter `cover: image.japan.harbor-dusk` |
| A 3D model as a landmark | `"preset": "model", "assetId": "model.singapore.marina-tower"` in `landmarks.json` |

## Replacing a model or image

1. Put the new file in place, overwriting the old one or under a new name.
2. Update the manifest entry's `path` if the name changed, and bump `version`.
3. Run `npm run assets:audit`.

Nothing that refers to the ID changes. To retire an asset:

1. Set its `status` to `deprecated`. The audit then reminds you it is still in use.
2. Once nothing refers to it, remove the entry and the file.

## Checking assets

```bash
npm run assets:audit
```

It reports the following. Errors fail the command; warnings do not.

**Errors:**

- a manifest entry whose file is missing
- a duplicate ID
- an unsupported format for the type
- a filename that breaks the convention
- a missing attribution
- a file far over its size budget

**Warnings:**

- a file in `public/world-assets/` that is not registered
- a registered asset nothing uses
- a file over its size budget
- a version-like filename

Size budgets: models 1.5 MB, textures 1 MB, images 600 KB, thumbnails 120 KB, icons 64 KB.

`npm run world:validate` also fails on any content or landmark that names an asset missing from the manifest, or one of the wrong type.

The audit never changes, converts, or compresses a file. Optimize originals before adding them, for example WebP for images and Draco- or Meshopt-compressed GLB for models.

## Models in the browser

The model loader is a separate download, fetched only when a world uses a `model` landmark. A model that fails to load leaves that spot empty instead of breaking the globe. Models are copied per landmark, so the same model can stand on several shores.
