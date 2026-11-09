# Configuration reference

The authoritative definition of every file is `src/runtime/configuration/schema.ts`. Options for landmark presets and layout components are in `landmark-params.ts`. `npm run world:build` also writes them as JSON Schemas in `schemas/`.

This page summarizes each file. Every file has `"schemaVersion": 1`. Unknown fields are rejected.

**Conventions:**

- **IDs** are lowercase words joined by hyphens (`hong-kong`).
- **Text keys** are dotted (`location.hong-kong.name`).
- **Paths** are relative to the file that mentions them, and may not leave `world/`.
- **Units:** angles on the globe are degrees, scene distances are globe units, and colors are `#rrggbb`.

## world.json

| Field | Meaning |
|---|---|
| `id` | The world's ID |
| `nameKey`, `descriptionKey` | Page title and description, from the locale |
| `defaultLocale`, `locales` | Locales are files in `locales/`; the default must have every key |
| `defaultTheme`, `themes` | Theme ID → file |
| `settings.*`, `locations`, `formations`, `layouts.*`, `messages`, `assets` | Where each other file is |

## settings/

| File | Fields |
|---|---|
| `globe.json` | `radius`; `axialTiltDeg`; `iceCapLatitudeDeg`; `quality` (`high`/`medium`/`low`) and `qualityPresets` (`landSegments`, `oceanSegments`, `maxPixelRatio`); `placementRules` (`minShoreSeparationDeg`, `poleClearanceDeg`) |
| `camera.json` | `fovDeg`, `near`, `far`; `direction` (the camera's line toward the center); `minDistance`, `maxDistance`, `defaultDistance`; `focusDropDeg` (where a chosen shore rests); `initialOrientation` (`pitchDeg`, `yawDeg`, `face`) |
| `controls.json` | `rotationMode` (`trackball` only); `dragSensitivity`; `inertia` (`enabled`, `decayPerSecond`, `maxRadiansPerSecond`); `focusEasing`; `zoom` (`wheelSensitivity`, `pinchSensitivity`, `buttonStep`); `keyboard` (`enabled`, `rotateStepPx`, `zoomStep`); `clickTolerancePx`; `entryTransition` (`durationMs`, `diveDistance`); `autoRotate` (`enabled`, `radiansPerSecond`, `idleDelaySeconds`, `speeds`, `defaultSpeed`); `respectReducedMotion` |
| `environment.json` | `background`; `lights` (`hemisphere`, `ambient`, `key`, `fill`); `stars`; `sun`; `atmosphere` (`color`, `strength`, `scale`); `clouds` (`seed`, and for `puffy` and `wispy`: `count`, `color`, `opacity`, `altitude`, `speed`) |
| `backdrop.json` | `planets[]`: `id`, `nameKey`, `position`, `radius`, `spin`, `tiltDeg`, `look` (`painted`: `style` `banded` or `rocky`, `colors`, `ring`, `seed`; or `image`: `assetId`), `entry` (as for locations, or `null`) |
| `features.json` | `backdropPlanets`, `clouds`, `stars`, `formations`, `polarLandmarks`, `announcements`, `localeFromUrl` |
| `discovery.json` | `smileGreeting` (`enabled`, `formation`, `messageKey`, `alignment`) |
| `categories.json` | `categories[]`: `id`, `labelKey`, `pluralKey`, `order`, `listed` (appears in filters and the directory) |

Cross-checks:

- `defaultDistance` must lie between `minDistance` and `maxDistance`.
- `minDistance` must stay outside the globe.
- `defaultSpeed` must be one of `speeds`.

## locations/

**`index.json`:** `locations[]`, folder paths relative to `locations/`.

**`<folder>/location.json`:**

| Field | Meaning |
|---|---|
| `id`, `category`, `status` | `status` is `published`, `draft`, or `hidden`; only `published` is built |
| `display` | `nameKey`, `shortNameKey`, `descriptionKey` (the tagline); `showLabel`, `showOnGlobe`, `showInDirectory`; `sortOrder` |
| `placement` | `latitude`, `longitude`, `altitude` (lifts landmarks), `scale`, `headingDeg` |
| `appearance` | `ground` (interior land color), `shore`, `accent` (landmarks may use it) |
| `references` | `terrain`, `landmarks`, `items`: file names, or `null` |
| `interaction` | `selectable` (a shore visitors can choose), `tooltipEnabled` (hover tooltip for non-selectable places), `markerRadius` (selection ring and click target) |
| `tags`, `parent`, `related` | Grouping and links to other location IDs (checked to exist) |
| `entry` | Optional. The world clicking the island opens: `type` (`url`), `href` (a path on this site or `https://`), `openIn` (`same-tab` or `new-tab`), `transition` (`dive` or `none`), `labelKey`. Without it, clicking only selects |

**`terrain.json`:** `locationId` and one `shape`:

| `type` | Fields |
|---|---|
| `oval` | `radiusDeg` [half-length, half-width], `headingDeg`, `flatRadiusDeg` |
| `outline` | `scaleDeg` (one outline unit in degrees), `anchor` (the center's position in the outline), `parts` (polygons, x east and y north), `flatRadiusDeg` |
| `lobes` | `lobeRadiusDeg`, `bridgeHalfWidthDeg`, `flatRadiusDeg`, `lobes[]` (`id`, `atDeg` [east, north], `ground`), `bridges[]` (pairs of lobe indexes) |
| `none` | No land (the poles stand on the ice cap) |

`flatRadiusDeg` keeps ridges and hills off the ground under landmarks.

**`landmarks.json`:** `locationId` and `landmarks[]`:

| Field | Meaning |
|---|---|
| `id` | The landmark's ID |
| `preset` | Which landmark to draw (see `authoring.md`) |
| `assetId` | Required for `model` |
| `labelKey` | Optional text key |
| `lobe` | Stand on this lobe of a lobed island |
| `position` | `[east, up, north]` in globe units, following the curve |
| `rotationDeg`, `scale` | Turn and size |
| `visible` | Hide without deleting |
| `animation` | `default` or `none` |
| `params` | Checked against the preset's own schema |

**`items.json`:** `sections[]`:

| Field | Meaning |
|---|---|
| `id` | The section's ID |
| `source` | A Markdown file in the location folder, or `shared/…` |
| `display` | `article`, `card`, `accordion`, `tab`, `gallery`, `image`, `links`, or `info` |
| `order`, `visible` | Position and visibility |

**`content/*.md` front matter:**

- `id` and `status` are required.
- `title` or `titleKey` is required.
- `summary`, `cover` (an `asset:` ID), `tags`, `author`, and `updated` (`YYYY-MM-DD`) are optional.

## formations/

**`index.json`:** `formations[]`, file paths.

**`type: "island-arrangement"`** (such as the smiling hemisphere):

| Field | Meaning |
|---|---|
| `center` | Latitude and longitude of the arrangement |
| `uprightAgainstTilt` | Keep it upright in the opening view |
| `clearanceDeg` | Named shores keep out of this radius |
| `islands[]` | `id`, `role`, `atDeg`, `radiusDeg`, `headingDeg`, `ground`, `dress` (`forest`, `palms`, `peak`, `pines`) |
| `arcs[]` | Islands strung along an arc: `centerDeg`, `radiusDeg`, `fromDeg`, `toDeg`, `lengthsDeg[]`, `jitterDeg[]`, `widthDeg`, `ground`, `dressEvery`, `dress` |

**`type: "islets"`:** `islands[]` with `latitude`, `longitude`, `radiusDeg`, `headingDeg`, `flatRadiusDeg`, and `dress` (`pines` or `palms`).

## layouts/

| File | Fields |
|---|---|
| `explorer.json` | `regions` (`top`, `bottomLeft`, `bottomRight`); `leftPanel` and `rightPanel` (`enabled`, `width`, `open`, `sections`). A section is `id`, `component`, `order`, `visible`, and `props` |
| `destination-panel.json` | `showCategory`, `showTagline`, `emptyMessageKey`, `expandAccordions` |
| `navigation.json` | `filters[]` (`id`, `labelKey`, `categories` as `all` or a list of category IDs); `directory.groupByCategory` |

## themes/

| Field | Meaning |
|---|---|
| `ui` | Optional overrides of interface CSS tokens. Only these are accepted: `--background`, `--foreground`, `--card`, `--card-foreground`, `--primary`, `--primary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--border`, `--ring`, `--radius` |
| `globe` | `ocean` (`deep`, `shallow`, `rim`), `land` (`shore`, `grass`, `meadow`, `rock`, `snow`), `ice` (`cap`, `edge`), `selection` (`selected`, `hovered`) |

## locales/

Flat `{ "text.key": "Text" }` objects.

- `{name}` placeholders are filled in by the interface.
- The default locale must contain every key the world uses.
- Other locales may leave keys out; they fall back to the default.
- Validation reports missing keys (errors), unused keys (warnings), and keys missing from other locales (warnings).
- Visitors can pick a locale with `?lang=fil` when `localeFromUrl` is on.

## messages/announcements.json

`announcements[]`:

| Field | Meaning |
|---|---|
| `id`, `messageKey` | The announcement and its text |
| `enabled`, `priority` | Higher priority shows first |
| `startsAt`, `endsAt` | `YYYY-MM-DD` or `null` |
| `placement` | `top` or `bottom` |
| `dismissible` | Whether visitors can close it |

## assets/manifest.json

`root` is the asset folder inside `public/`, relative to the project. `assets[]`:

| Field | Meaning |
|---|---|
| `id` | Dotted: `landmark.japan.gate` |
| `type` | `model`, `texture`, `image`, `icon`, `audio`, `thumbnail`, `environment`, `animation` |
| `path` | `category/owner/descriptive-name.ext` |
| `displayName`, `version`, `status`, `license`, `attribution`, `tags` | `status` is `active`, `deprecated`, or `draft`. `attribution` is required unless the license is `original` |
