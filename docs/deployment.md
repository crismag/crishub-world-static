# Deploying CrisWorld to Hostinger

CrisWorld is a static site. Hostinger only serves files; everything runs in the visitor's browser. No Node.js, PHP, database, or server process is needed after deployment, and nothing is deployed automatically.

## 1. Build

On your own machine, with Node.js 22 or newer:

```bash
npm ci                 # exact dependencies from package-lock.json
npm test               # optional, recommended: configuration, regression, and UI tests
npm run build          # compiles world/, type-checks, bundles; stops on any configuration error
npm run verify:dist    # checks dist/ is self-contained and reports download sizes
npm run serve:dist     # optional: browse the build at http://localhost:4732, served like Hostinger
```

The output is the **`dist/`** folder.

## 2. What to upload

Upload the **contents** of `dist/`, not the folder itself.

| Path in `dist/` | What it is |
|---|---|
| `index.html` | The page |
| `.htaccess` | Cache headers, MIME types, no directory listings. It is a hidden file, so make sure your upload includes it |
| `build-info.json` | Version, commit, and build time: open it in the browser to confirm what is live |
| `assets/` | Fingerprinted JavaScript, CSS, fonts, and one small content file per shore |
| `world-assets/` | Managed images, icons, and models (with their own `.htaccess`) |
| `decoders/draco/` | 3D-model decoder, fetched only if a compressed model is shown (with its own `.htaccess`) |

## 3. Where to put it

1. In hPanel, open **Websites → Manage** for crishub.com.
2. Under **Domains → Subdomains**, make sure `world.crishub.com` exists, and note its folder. It is usually `public_html/world` for a subdomain.
3. Open **File Manager** in that folder.
4. Upload the contents of `dist/` there. The easiest way is to zip the contents of `dist/`, upload the zip, and use **Extract** in File Manager.
5. Enable **Show hidden files** in File Manager's settings and check that `.htaccess` is present.
6. Visit `https://world.crishub.com/build-info.json`, then `https://world.crishub.com/`.

Paths are relative, so the same build also works from a subfolder, for example `crishub.com/world/`.

## 4. Routing

CrisWorld has no server routes. A shore is addressed by its URL hash, as in `https://world.crishub.com/#japan`; the hash never reaches the server, so it works with no configuration.

**No fallback to `index.html` is configured, on purpose.** A missing file returns a real **404**, so a broken asset link shows up as an error instead of silently loading the app. Do not add a catch-all rewrite.

## 5. Caching

`.htaccess` sets these rules. Hostinger's Apache and LiteSpeed servers both honor them.

| Files | Cache-Control | Why |
|---|---|---|
| `assets/*-<hash>.js`, `.css`, `.woff2` | `public, max-age=31536000, immutable` | A changed file gets a new name, so the old one can be kept forever |
| `index.html`, `build-info.json` | `no-cache` | They change with every deploy; browsers must check for a new copy |
| `world-assets/**`, `decoders/**` | `public, max-age=86400, must-revalidate` | Their names stay the same across versions |

**Hostinger CDN or LiteSpeed cache:** if either is enabled, **purge the cache after each deploy**. Otherwise visitors may keep an old `index.html` that points at files no longer on the server. You can purge in hPanel → **Performance** → **CDN** or **Cache Manager**.

**Replacing a file in `world-assets/`:** bump its `version` in `world/assets/manifest.json`. Browsers may keep the old copy for up to a day. If it must change immediately, give it a new file name.

## 6. MIME types

`.htaccess` declares the types Hostinger might not know:

| Extension | Type |
|---|---|
| `.js` | `text/javascript` |
| `.json` | `application/json` |
| `.woff2` | `font/woff2` |
| `.glb` | `model/gltf-binary` |
| `.gltf` | `model/gltf+json` |
| `.wasm` | `application/wasm` (required for the Draco decoder) |
| `.webp`, `.avif`, `.svg`, `.ktx2` | `image/*` |
| `.mp3`, `.ogg`, `.m4a` | `audio/*` |

`.htaccess` also turns on compression for text, JSON, SVG, and WebAssembly.

## 7. Rollback

Every build is just files, so rolling back means putting the previous files back.

1. **Before each deploy,** keep the zip you uploaded, named for its `build-info.json` commit, for example `crisworld-61cde29.zip`. Optionally, in File Manager, compress the live folder into a backup first.
2. **To roll back,** delete the folder's contents and extract the previous zip, or restore the backup.
3. **Purge** the Hostinger cache if one is enabled.
4. **Confirm** by checking `build-info.json` shows the old commit.

Because asset names are fingerprinted, leftover files from a newer build are harmless; they are simply unused. You can clean them up whenever convenient.

Hostinger's own daily backups (hPanel → **Files → Backups**) are a second safety net.

## 8. Checklist after deploying

- [ ] `build-info.json` shows the expected commit.
- [ ] The globe appears, turns on its own, and can be dragged freely, including upside down.
- [ ] Both poles render: the Beacon at the top, the Vault at the bottom.
- [ ] Every shore label appears around the globe.
- [ ] Choosing a shore shows its chip; **Read** opens the panel with its article.
- [ ] `https://world.crishub.com/#japan` opens with Japan selected.
- [ ] `https://world.crishub.com/assets/missing.js` returns 404, not the app.
- [ ] The browser's network panel shows requests only to `world.crishub.com`.
