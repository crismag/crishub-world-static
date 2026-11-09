# CrisWorld architecture

**The engine decides how CrisWorld works. Configuration decides what it contains and how it is presented.**

Everything a content author changes lives in `world/` as JSON and Markdown. The code in `src/` knows how to draw a globe, islands, landmarks, panels, and text, but not which islands exist, where they are, what they are called, or what is written about them.

## The pipeline

```text
world/  ──►  validate  ──►  resolve references  ──►  compile Markdown  ──►  src/generated/world.json  ──►  app
(JSON + Markdown)  (schemas)    (text keys, assets,       (safe HTML)            (the registry)
                                 categories, files)
                    └──────────── geography checks: flat landmarks, open ocean, nothing on the ice ───────┘
```

- **`npm run world:build`** runs the whole pipeline and writes the registry, plus JSON Schemas in `schemas/` for editor autocompletion. `npm run dev`, `npm run build`, and `npm test` all run it first.
- **The dev server** recompiles whenever a file under `world/` changes, and shows problems in the terminal and the browser overlay.
- **Broken configuration stops the build.** Every problem is reported with the file it came from, all at once.
- **The app reads only the registry**, through `src/runtime/world-registry`. No component loads files from `world/` on its own.

The compiler lives in `src/runtime/configuration/compile.ts`. It never throws on bad input; it collects diagnostics. Geography checks need the real terrain, so they run on the compiled world in `src/engine/terrain/checks.ts`.

## Directory structure

```text
world/                          what the world contains (edit these)
├── world.json                  identity, locales, and where every other file is
├── settings/                   globe, camera, controls, environment, features, discovery, categories
├── locations/
│   ├── index.json              the list of location folders
│   ├── countries/<id>/         location.json, terrain.json, landmarks.json, items.json, content/*.md
│   ├── virtual/<id>/           project islands
│   ├── realms/<id>/            imagined lands
│   ├── mystery/<id>/           uncharted shores
│   └── special/<id>/           north-pole, south-pole, programming
├── formations/                 decorative geography: the smiling hemisphere, scattered islets
├── layouts/                    explorer regions and panels, the reading panel, filters and directory
├── themes/                     colors for the globe and (optionally) the interface
├── locales/                    en.json (default), fil.json
├── messages/                   announcements
└── assets/manifest.json        every managed asset, by stable ID

public/world-assets/            the asset files themselves, served as-is
schemas/                        generated JSON Schemas (from src/runtime/configuration/schema.ts)

src/
├── runtime/
│   ├── configuration/          schema.ts (the one definition), compile.ts, landmark-params.ts, sphere.ts, theme.ts
│   ├── world-registry/         loads the compiled registry; lookups by ID, category, filter
│   ├── localization/           text lookup with fallback, `useText()`, the list of UI text keys
│   ├── assets/  features/      asset paths by ID; feature switches
├── engine/
│   ├── globe/                  Scene (camera, rotation, lights), Planet (ocean, land, clouds), LocationNode, Formations
│   ├── terrain/                land from configuration (pure math), noise, geography checks
│   ├── controls/               quaternion trackball rotation
│   ├── landmarks/              preset registry, bespoke landmarks, poles, lettering, general-purpose generators, model loader
│   ├── interactions/           cursor, hotspots, imperative globe API
│   └── effects/                shaders, toon material
├── ui/
│   ├── Explorer.tsx            the page: places configured components into regions and panels
│   ├── components/             the registered components, and the registry that maps names to them
│   ├── panels/  content-renderers/
├── state/explorer.tsx          selection, filter, rotation speed, panel state
└── generated/world.json        the compiled registry (not committed)

scripts/                        world.ts (validate, build), world-build.ts, assets-audit.ts
tests/                          configuration, regression, and UI tests; fixtures/baseline.json
docs/                           this file, authoring.md, configuration.md, assets.md
```

## Principles, and how they are kept

| Principle | How |
|---|---|
| Stable engine, configurable world | No location name, coordinate, description, or asset path appears in `src/`. |
| One source of truth | Each value has one file. TypeScript types and JSON Schemas are both derived from `schema.ts`. Locations are listed once, in `locations/index.json`. |
| Stable identities | Locations, landmarks, content sections, formations, and assets have permanent lowercase IDs. Display names are text keys. URL hashes use IDs. |
| Schema validation | Every file has a strict schema: unknown fields, bad ranges, and typos fail. References between files are checked too. |
| Declarative UI | Layouts pick from a fixed list of components, with props checked per component. Configuration never contains code, and nothing is imported by name at runtime. |
| Modular locations | Each location is a self-contained folder. |
| Static-first | The build is plain files; no server, database, or runtime service. |

## Precedence

When more than one layer sets something, the more specific one wins:

1. **Engine defaults**: the defaults in `landmark-params.ts`, and engine constants in code.
2. **World settings**: `settings/*.json`.
3. **Theme**: `themes/<id>.json`, for globe colors and interface tokens.
4. **Location**: its own `appearance` colors, `placement` scale and heading, and its landmarks' `params`.

**The visitor's reduced-motion setting** overrides all of these when `controls.respectReducedMotion` is on. Effects hold still, and the planet opens paused; the visitor can still choose a rotation speed.

## Migration inventory

Everything below was hardcoded in `src/` before the migration (commit `ed104d2`), and now lives in configuration.

| Was | Now |
|---|---|
| Destination list, names, kinds, stories, colors (`src/data/destinations.ts`) | `world/locations/**/location.json`, `content/overview.md`, `locales/en.json` |
| Placement algorithm (lattice, project ring, archipelago pairing) | Frozen coordinates in each `location.json`. Placement is now authored, and checked by rules in `settings/globe.json`. |
| Country outlines, oval shapes, Naruto lobes (`outlines.ts`, `terrain.ts`) | Each location's `terrain.json` |
| Landmark switch (`landmarks.tsx`, `realms.tsx`) | `landmarks.json`, naming a preset |
| Programming continent and its technologies (`programming.ts`) | `locations/special/programming/` |
| Poles (`north-pole.ts`, `south-pole.ts`, and colors inside the components) | `locations/special/north-pole/`, `south-pole/`, with `params` |
| Smiling hemisphere (`smile.ts`) | `formations/smiling-hemisphere.json` |
| Scattered islets | `formations/scattered-islets.json` |
| Camera, zoom limits, drag sensitivity, inertia, auto-rotate speeds | `settings/camera.json`, `settings/controls.json` |
| Lights, stars, sun, atmosphere, clouds | `settings/environment.json` |
| Ocean, land, ice, and selection colors | `themes/default.json` |
| Legend filters | `layouts/navigation.json` |
| Interface placement | `layouts/explorer.json` |
| Every interface string | `locales/en.json` (and `fil.json`) |
| Favicon | `assets/manifest.json` and `public/world-assets/` |

A regression test compares the migrated world with a snapshot of the original, taken before migration (`tests/fixtures/baseline.json`):

- every shore, lobe, islet, and smile island is in the same place, to within a millionth of a radian
- 3,000 terrain samples across the globe have the same field, height, rock, and owner

## What stays in code, and why

These are how the world is drawn, not what it contains:

- **Terrain look.** Coast steepness, plateau and ridge heights, noise frequencies, and the coast wobble (`engine/terrain/terrain.ts`). Changing them changes every island at once, and the geography checks depend on them.
- **Shaders and the toon ramp.** The cartoon look of water, atmosphere, aurora, and land.
- **The shapes of the bespoke landmarks.** Each is a small hand-built model. Configuration chooses which one stands where and supplies accent colors; drawing a new one means adding a preset in code (see `authoring.md`).
- **Cloud puff shapes and the polar landmarks' geometry.** Their colors, counts, effects, and speeds are configurable.
- **The pixel thresholds for label fading** near screen edges.
- **The prop scatter on the smiling hemisphere** (`Formations.tsx` uses seed 808). It is decoration, not content.

## Known limitations and future improvements

- **No 3D models yet.** The `model` landmark preset loads glTF/GLB from the asset manifest, and its loader downloads only when used. But no model asset exists yet, so that path has been tested only by validation, not by eye.
- **No video embeds.** The `article`, `card`, `accordion`, `tab`, `gallery`, `image`, `links`, and `info` displays exist; approved-provider video embeds do not.
- **No search.** The directory exists (`DestinationDirectory`; enable it with the left panel in `layouts/explorer.json`). A search box would be a new registered component.
- **Shore names fall back to English** in `fil.json`, by design; the interface itself is translated.
- **Placement is authored now, not computed.** The old automatic spreading was replaced by explicit coordinates. Validation rejects shores that are too close together, too close to a pole, or inside a formation. A future CrisWorld Studio could suggest open spots.
- **One axial tilt for all lettering.** The programming lettering and the smiling face are set upright against the tilt in the opening view. After free tumbling they can read tilted; Reset straightens them.
- **Announcements are checked in the visitor's browser,** against the visitor's date.
