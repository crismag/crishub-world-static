# Static deployment readiness

**Verdict: CrisWorld runs entirely in the visitor's browser. Hostinger only serves static files.**

This report covers `crishub-world-static`, starting from commit `61cde29` (the configuration-driven world).

## 1. Audit: what was already static

| Question | Finding before this work |
|---|---|
| Vite static app? | Yes. `npm run build` produced `index.html`, `assets/`, and `world-assets/`, with relative paths (`base: './'`). |
| Node.js server in production? | None. Node.js was used only for building and development. |
| PHP, server-side rendering, API endpoints, databases? | None. No `fetch`, no WebSocket, no environment variables, no server files. |
| Markdown or configuration processed on the server? | No. `world:build` compiled them at build time, but **every article was inlined into the single main JavaScript file**. |
| Self-contained build? | Almost. **The 3D-model loader's Draco decoder defaulted to Google's CDN** (`gstatic.com`). It was never triggered, since no model exists yet, but it was a latent outside dependency. |
| Persistent backend needed? | No. Announcement dismissals use the visitor's own browser storage. |
| Routes? | None. Shores are URL hashes, which never reach the server. |

The build pipeline was already correct, so it was kept, not rewritten.

## 2. What changed

| Area | Change |
|---|---|
| Content | `world:build` now writes a slim registry plus **one content file per location** (`src/generated/content/<id>.json`). The build turns each into a fingerprinted file that is fetched only when that shore's panel opens, and prefetched when the shore is selected. The panel shows its header at once, a loading line while the article arrives, and a retry button if the request fails. |
| Bundles | Three.js and React are split into their own long-lived files. A content or app update now re-downloads only the app file (about 125 KB gzipped) instead of everything (about 384 KB). |
| Draco | The decoder is served from this site (`decoders/draco/`), and the model loader always uses it. A test guards this. |
| Device quality | `settings/globe.json` → `"quality": "auto"` picks the globe mesh per device: low for 2 GB of memory or 2 cores or fewer, medium for touch devices, small screens, or 4 GB or less, and high otherwise. `?quality=` overrides it. |
| GPU resources | The ocean and land meshes release their GPU buffers on unmount (other meshes already did, through React Three Fiber). `?perf` exposes the renderer's counters as `window.crisworldPerf` for measuring. |
| Hosting | `.htaccess`: cache rules, MIME types, compression, no directory listings, and **no fallback to `index.html`**. |
| Deployment | `build-info.json` stamps each build with version, commit, and time. |
| Tools | `npm run serve:dist` (a static server matching Hostinger's behavior) and `npm run verify:dist` (a self-containment check and size report). |

Nothing was removed: the configuration, rendering, controls, poles, smile, layouts, localization, and asset management all work as before.

## 3. Server-side dependencies, before and after

| | Before | After |
|---|---|---|
| Server process in production | none | none |
| PHP / SSR / database / API | none | none |
| Runtime requests to other sites | 1 latent (Draco decoder, Google CDN) | **none** |
| Server configuration needed | none, but no cache or MIME rules | `.htaccess` (cache, MIME, compression), applied automatically |
| What Hostinger does per visit | serve files | serve files |

## 4. Browser performance

Sizes are gzipped as the browser downloads them, measured by Vite and by `npm run verify:dist`.

| | Before | After |
|---|---|---|
| JavaScript before the globe can start | 1 file, 384.3 KB | 4 files, 382.3 KB (app 125.3, Three.js 188.3, React 68.3, runtime 0.4) |
| CSS | 8.5 KB | 8.5 KB |
| Articles in the first download | all of them | **none** (24 files, 8.5 KB in all, fetched one at a time on selection) |
| Re-downloaded after a content or app update | 384 KB | **about 125 KB** (vendor files stay cached) |
| Model loader | 21 KB, on demand | 21 KB, on demand |
| Draco decoder | from Google, on demand | 188 KB from this site, only if a compressed model is shown |
| Whole site on disk | 1.7 MB | 2.4 MB (the extra is the self-hosted decoder) |

The first-load size is essentially unchanged, because the globe genuinely needs Three.js and React up front. The gains are in **what never loads** (articles until opened, decoders until needed) and in **caching across updates**.

**GPU memory for the land mesh**, by quality level. These are estimates: positions, normals, and colors at 36 bytes per vertex, plus indices.

| Quality | Vertices | Triangles | GPU buffers |
|---|---|---|---|
| high (desktop) | ~205k | ~409k | ~11.8 MB |
| medium (phones, small or 4 GB devices) | ~101k | ~200k | ~5.8 MB |
| low (2 GB or 2-core devices) | ~51k | ~102k | ~2.9 MB |

Everything else on the globe is small, shared primitive geometry. The one canvas texture (the programming lettering, 2048 × 2048) is about 21 MB of GPU memory with mipmaps, and is released on unmount. Level-of-detail swapping for individual landmarks was **not** added: they are a few hundred triangles each, so it would add cost without a visible saving.

## 5. Verification results

**Automated, passing:**

- **`npm run world:validate`:** 27 locations, 2 formations, every reference resolved, geography checks clean.
- **`npm run assets:audit`:** assets in order.
- **`npm test`:** 56 tests.
  - configuration validation
  - regression against the pre-migration baseline, covering positions and 3,000 terrain samples
  - unrestricted rotation, with both poles centerable
  - UI: layout, locale, selection, on-demand writeups, filters, directory
  - static-site guards: Draco is self-hosted, no fallback to `index.html`, no server calls in the source
- **`npm run build` and `npm run verify:dist`:**
  - every referenced file exists, with relative paths
  - no `localhost`, dev-server, or source references
  - no requests to other sites
  - `.htaccess`, `build-info.json`, and the decoder are present
  - no server-side files
- **`npm run serve:dist`, probed over HTTP:**
  - `index.html` and `build-info.json` are `no-cache`
  - fingerprinted files are immutable for a year
  - `world-assets/` and `decoders/` are cached for a day
  - `.wasm` is served as `application/wasm`
  - a missing asset, `/japan`, and `/.htaccess` all return **404**

**Not verified here: the visual checks.** This environment has no browser that can run WebGL (Playwright's Chrome is not installed, and its Chromium lacks system libraries). Please check by eye with `npm run serve:dist` or after uploading, using the checklist in `deployment.md` §8:

- the globe renders and rotates freely
- both poles render
- all islands appear
- panels show articles
- the network panel shows only same-site requests
- for GPU counters, open `/?perf` and run `crisworldPerf.renderer` in the console

**Not applicable:**

- **Search:** CrisWorld has no search feature. Navigation is the globe, the legend filters, the URL hash, the screen-reader list, and the optional directory panel.
- **Image and model loading:** no images (besides the favicon) or models exist yet. Their loading paths (lazy `<img>`, the on-demand model loader, and the self-hosted decoder) are in place and verified at the file and HTTP level only.
