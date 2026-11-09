# Authoring CrisWorld

Everything here is done by editing files in `world/`. Run `npm run world:validate` after a change: it lists every problem with the file it is in, and checks the geography (landmarks on flat ground, every island on the open ocean). With `npm run dev` running, saved changes appear in the browser within a second.

Units: globe positions and sizes are **degrees**; distances in the scene (landmark offsets, camera distance) are **globe units** (the globe's radius is 4). Colors are `#rrggbb`. Text shown to visitors is never written into JSON directly; JSON names a **text key**, and the words live in `world/locales/en.json`.

---

## 1. Add an island

Create a folder under the right category, such as `world/locations/virtual/test-lab/`, with these files.

`location.json`

```json
{
  "schemaVersion": 1,
  "id": "test-lab",
  "category": "virtual",
  "status": "published",
  "display": {
    "nameKey": "location.test-lab.name",
    "shortNameKey": "location.test-lab.short",
    "descriptionKey": "location.test-lab.description",
    "showLabel": true,
    "showOnGlobe": true,
    "showInDirectory": true,
    "sortOrder": 500
  },
  "placement": { "latitude": -50, "longitude": 42, "altitude": 0, "scale": 1, "headingDeg": 0 },
  "appearance": { "ground": "#4a7a9c", "shore": "#e6d5bc", "accent": "#ff9f43" },
  "references": { "terrain": "terrain.json", "landmarks": "landmarks.json", "items": "items.json" },
  "interaction": { "selectable": true, "tooltipEnabled": true, "markerRadius": 0.42 },
  "tags": [],
  "parent": null,
  "related": []
}
```

`terrain.json` (an oval island about 7° long, with flat ground for the landmark in the middle):

```json
{
  "schemaVersion": 1,
  "locationId": "test-lab",
  "shape": { "type": "oval", "radiusDeg": [7, 6.3], "headingDeg": 20, "flatRadiusDeg": 4.3 }
}
```

`landmarks.json`, `items.json`, and `content/overview.md`: see sections 5 and 7.

Then:

- Add `"virtual/test-lab"` to `world/locations/index.json`.
- Add the three text keys to `world/locales/en.json`.

The folder name must end with the location's `id`. The `id` is permanent: it is the URL hash (`#test-lab`) and how everything else refers to the island.

**Finding room.** Shores must stay at least `minShoreSeparationDeg` (25.5°) apart, clear of the poles, and outside any formation's `clearanceDeg`. Validation names the shore you are too close to.

**Status.** `published` is built; `draft` and `hidden` are validated with warnings and left out of the build.

## 2. Move an island

Change `placement.latitude` and `placement.longitude` in its `location.json`.

- Longitude 0 faces the viewer when the page opens.
- East is positive.
- The poles are ±90° latitude.

The island, its landmarks, and its label all move together.

## 3. Resize or turn an island

- `placement.scale` grows or shrinks the island **and** its landmarks together (0.25 to 4).
- `placement.headingDeg` turns them clockwise as seen from above.

To change only the land, edit `terrain.json`: `radiusDeg` for an oval, `scaleDeg` for an outline, or `lobeRadiusDeg` for lobes. If the landmark no longer fits on flat ground, validation says so; raise `flatRadiusDeg` or make the island bigger.

## 4. Rename a destination, or change any visible text

Edit the text in `world/locales/en.json`. For example, change `"location.japan.name"`. The ID does not change, so links and references keep working.

- **Other languages:** add the same key to `fil.json`. A missing key falls back to English.
- **Tooltips** for the poles are their location name and description keys.
- **Interface strings** are the `ui.*` keys.

## 5. Add a landmark

Add an entry to the location's `landmarks.json`:

```json
{
  "id": "harbor-light",
  "preset": "tower",
  "assetId": null,
  "labelKey": null,
  "lobe": null,
  "position": [0.12, 0, -0.08],
  "rotationDeg": [0, 45, 0],
  "scale": 1.3,
  "visible": true,
  "animation": "default",
  "params": { "height": 0.35, "roof": "#2f6fd0" }
}
```

**`position`** is `[east, up, north]` in globe units from the location's center. East and north follow the globe's curve, so the landmark stays on the ground.

**`lobe`** stands the landmark on one lobe of a lobed island (see Naruto Islands).

**Presets:**

| Preset | What it draws |
|---|---|
| `tower` | A round tower with a roof and windows |
| `crystal` | A cluster of glowing crystals |
| `mountain` | A low-poly mountain, optionally snow-capped |
| `pine-grove`, `palm-grove` | A scatter of trees |
| `model` | A 3D model from the asset manifest (see `assets.md`) |
| `beacon`, `vault` | The pole landmarks |
| `lettering`, `continent-scenery` | The programming continent's words and scenery |
| `classic-<id>`, `leaf-village`, `rain-town`, … | The original bespoke landmarks |

Each preset's `params`, with defaults, are in `src/runtime/configuration/landmark-params.ts`. Unknown params are rejected.

**A new kind of landmark** (a new shape) needs code. Add a component in `src/engine/landmarks/`, list its name in `LandmarkPresetNames` in `schema.ts`, give it a params schema in `landmark-params.ts`, and register it in `landmarks/registry.tsx`.

## 6. Replace a 3D model

Point the asset manifest entry at the new file, and bump its `version`. Every landmark that uses that `assetId` picks it up, with no landmark changes. See `assets.md`.

## 7. Add a Markdown article

1. Write `content/history.md` in the location's folder:

   ```markdown
   ---
   id: history
   title: A short history
   summary: How the island came to be.
   tags: [history]
   status: published
   updated: 2026-11-08
   ---

   ## Early days

   Text with **emphasis**, [links](https://example.com), lists, tables, quotes, and code.
   ```

2. Add it to the location's `items.json`:

   ```json
   { "id": "history", "source": "content/history.md", "display": "accordion", "order": 20, "visible": true }
   ```

**Display types:**

| Type | How it shows |
|---|---|
| `article` | Title and text |
| `card` | A boxed card, with the `cover` image if set |
| `accordion` | A section that opens and closes |
| `tab` | One tab; neighboring `tab` sections share a tab bar |
| `gallery` | A grid of the document's images |
| `image` | The first image, large |
| `links` | A list of the document's links |
| `info` | A compact aside |

Raw HTML in Markdown is shown as plain text, and only `https:`, `http:`, `mailto:`, `#`, and `asset:` links are allowed.

**Shared content:** put a file in `world/shared/` and reference it as `"source": "shared/name.md"` from any location.

## 8. Add an image gallery

1. Register each image in `world/assets/manifest.json` (see `assets.md`).
2. Write a Markdown file with the images:

   ```markdown
   ---
   id: gallery
   title: Photos
   status: published
   ---

   ![The harbor at dusk](asset:image.japan.harbor-dusk)
   ![The gate from the water](asset:image.japan.gate-water)
   ```

3. Add it to `items.json` with `"display": "gallery"`.

Images must be registered assets (`asset:<id>`); outside URLs are rejected. Alt text becomes the caption.

## 9. Reorder or hide content sections

In `items.json`, change `order` (lower comes first), or set `"visible": false` to hide a section without deleting it.

## 10. Change the panel layout

Edit `world/layouts/explorer.json`.

- **Regions:** `top`, `bottomLeft`, and `bottomRight` hold small components.
- **Panels:** `leftPanel` and `rightPanel` are side panels.
  - `open: "always"` keeps a panel open.
  - `open: "on-demand"` opens it from the selection chip's Read button.
- **Sections:** each has a `component`, an `order`, `visible`, and `props`.

**Components and their props:**

| Component | Props |
|---|---|
| `SelectionChip` | `readMore` |
| `ShoreLegend` | — |
| `GlobeControls` | `showSpeed`, `showZoom`, `showReset` |
| `DestinationDetails` | — |
| `DestinationDirectory` | — |
| `Announcements` | `placement` |

For example, to show a directory of all shores on the left:

```json
"leftPanel": {
  "enabled": true,
  "width": 300,
  "open": "always",
  "sections": [{ "id": "directory", "component": "DestinationDirectory", "order": 10, "visible": true, "props": {} }]
}
```

**Related files:**

- `layouts/navigation.json`: the legend's filters and how the directory groups shores.
- `layouts/destination-panel.json`: what the reading panel shows above the content.

## 11. Change globe controls and the default view

**`settings/controls.json`:**

- drag sensitivity and inertia
- focus easing
- wheel, pinch, and button zoom steps
- keyboard steps
- the auto-rotate speed buttons and the default speed
- whether to respect reduced motion

Rotation is always unrestricted; there is nothing to configure that limits it.

**`settings/camera.json`:**

- field of view
- zoom limits and the default distance
- the opening orientation: `pitchDeg`, `yawDeg`, or `face`. With `face` set to a location or formation ID (for example `"smiling-hemisphere"`), the globe opens facing it.

## 12. Update messages and announcements

Interface messages are `ui.*` keys in the locale files.

Announcements are in `world/messages/announcements.json`:

```json
{ "id": "launch", "messageKey": "announcement.launch", "enabled": true, "priority": 20,
  "startsAt": "2026-12-01", "endsAt": "2026-12-31", "placement": "top", "dismissible": true }
```

- Dates are checked in the visitor's browser when the page loads.
- A dismissed announcement stays dismissed in that browser.
- `settings/features.json` → `announcements` switches them all off.

## 13. North and South Pole appearance

Edit the `params` of the landmark in `locations/special/north-pole/landmarks.json` or `south-pole/landmarks.json`.

**Beacon (north):**

```json
"params": {
  "colors": { "crystal": "#ffd36b", "gold": "#e8c25a" },
  "aurora": { "enabled": true, "strength": 0.6 },
  "beam": true,
  "rings": true,
  "animationSpeed": 0.7
}
```

**Vault (south):** `colors.core`, `colors.seam`, `colors.glyph`, `colors.fissure`, `colors.crater`, …, `pillars` (0–8), `snowfall`, and `animationSpeed`.

**Tooltips:** they are the location's name and description text keys. `tooltipDescription` shows or hides the description line.

**Visibility:** set the landmark's `visible` to false, or turn all polar landmarks off with `settings/features.json` → `polarLandmarks`.

## 14. Adjust the smiling hemisphere

Edit `world/formations/smiling-hemisphere.json`.

- **`center`** places the whole face.
- **`islands`** are the eyes, nose, and scattered islets, positioned with `atDeg` offsets from the center.
- **`arcs`** are the smile, built along an arc:
  - `radiusDeg` widens the smile
  - `fromDeg` and `toDeg` set how far up the corners curve
  - `lengthsDeg` and `jitterDeg` set each island's size and its nudge in or out
  - `widthDeg` sets how thick the islands are
- **`uprightAgainstTilt`** keeps the face upright in the opening view.

The optional "The world is smiling at you." line is `settings/discovery.json` → `smileGreeting.enabled` (off by default).

## 15. Validate

```bash
npm run world:validate   # every file, every reference, and the geography
npm run assets:audit     # asset files, formats, sizes, names, licenses
```

Both exit with an error if anything is wrong. Warnings, such as an unused text key or a translation falling back to English, do not fail them.

## 16. Build

```bash
npm run world:build   # writes src/generated/world.json and schemas/
npm test              # configuration, regression, rotation, and interface tests
npm run build         # static site in dist/, ready for Hostinger
```

`npm run build` runs `world:build` first, and stops on any configuration error.

## Editor autocompletion

`npm run world:build` writes a JSON Schema for every kind of file to `schemas/`. In VS Code, map them in your user or workspace settings, for example:

```json
"json.schemas": [
  { "fileMatch": ["world/locations/**/location.json"], "url": "./schemas/location.schema.json" },
  { "fileMatch": ["world/locations/**/landmarks.json"], "url": "./schemas/landmarks.schema.json" },
  { "fileMatch": ["world/locations/**/terrain.json"], "url": "./schemas/terrain.schema.json" },
  { "fileMatch": ["world/layouts/explorer.json"], "url": "./schemas/explorer-layout.schema.json" }
]
```
