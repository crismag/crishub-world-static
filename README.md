# Crishub World

Crishub World is a miniature planet you explore in the browser. Countries and software projects are ordinary shores on the same globe. Spin it, lean in, and step ashore.

The first playable slice is the Interactive Globe Explorer: one rotating world with 24 named shores (countries, projects, imagined realms, and four uncharted shores), a programming continent, and a few empty islets, all in one open ocean.

## Wander

- Drag the globe to turn it like a ball in your hand, in any direction: over the poles, upside down, any way you like. A short flick keeps it coasting. One finger turns it on a phone; two fingers pinch to zoom.
- The planet turns like Earth: west to east on its own axis, which starts tilted 23.4°. It starts again after a quiet moment when you let go, from wherever you left it. It never snaps back upright.
- The small speed buttons pause it or set ½×, 1×, or 3×. It opens at ½×; 1× is about one turn a minute. With reduced motion turned on, it starts paused.
- Choosing a shore turns the globe the short way round to bring it to the front. Reset returns to the opening view. Both poles are capped with ice and can be turned to face you.
- The globe opens fully zoomed out. Scroll, pinch, or use the small zoom buttons to lean closer.
- Click a landmark to select it. Its name shows in a small chip at the top. The world is the menu.
- The small legend at the bottom left lights up one kind of shore at a time.
- Arrow keys turn the globe. `+` and `-` zoom. Escape leaves the shore you are reading.
- A selected shore can be shared with its hash, for example `#japan` or `#crislab`.

Places, projects, realms, and uncharted shores are about the same size on purpose. Countries keep a simplified version of their real outline, not to scale. Naruto Islands is one shore made of four lobes (a leafy village, a rain town, a sound stage, and a sand town), joined by land bridges around a bay that opens to the sea. Every island has a coast on the open ocean.

## Run it locally

```bash
npm install
npm run dev
```

The dev server uses port **4731**. It compiles `world/` on start and again whenever a file there changes.

```bash
npm run world:validate   # check every file in world/, every reference, and the geography
npm run world:build      # compile world/ into src/generated/world.json (dev, test, and build do this first)
npm run assets:audit     # check asset files, formats, sizes, names, and licenses
npm test                 # configuration, regression, rotation, and interface tests
npm run lint
npm run build            # static site in dist/
npm run preview
```

## Put it on Hostinger

CrisWorld is a static site: Hostinger only serves files, and everything runs in the visitor's browser. No Node.js, PHP, or database is needed after deployment.

```bash
npm run build          # writes dist/
npm run verify:dist    # checks dist/ is self-contained and reports download sizes
npm run serve:dist     # browse the build at http://localhost:4732, served the way Hostinger will
```

Upload the **contents** of `dist/` (including the hidden `.htaccess`) to the subdomain's folder. [docs/deployment.md](docs/deployment.md) covers the web root, caching, MIME types, routing, rollback, and a post-deploy checklist. [docs/static-readiness.md](docs/static-readiness.md) is the readiness report, with before/after sizes.

## How it is built

The engine decides how CrisWorld works; configuration decides what it contains. Every island, landmark, label, article, color, layout, control setting, and asset is described in `world/` (JSON and Markdown) and compiled into one validated registry the app runs on. Adding or changing a destination is a content task, not a code change.

- [docs/authoring.md](docs/authoring.md): how to add an island, move or rename it, add landmarks and articles, change the layout and controls, and adjust the poles and the smile.
- [docs/configuration.md](docs/configuration.md): every configuration file and field.
- [docs/assets.md](docs/assets.md): managing images, icons, and 3D models.
- [docs/architecture.md](docs/architecture.md): how it fits together, what stays in code, and known limitations.
- [docs/deployment.md](docs/deployment.md): building and deploying to Hostinger.

A few places worth knowing:

- **The North Pole** carries the Beacon of Possibilities and **the South Pole** the Vault of Mysteries: `world/locations/special/north-pole/` and `south-pole/`.
- **The programming continent** paints its technologies across its ground, ringed by the project islands. Edit the words in `world/locations/special/programming/landmarks.json`.
- **The far side** has a small secret, in `world/formations/`.

Uncharted shores are visible on purpose. They explain that they are not open yet. They are not puzzles and they are not a second map.

## Stack

Vite, React, TypeScript, Three.js, React Three Fiber, shadcn/ui, Zod (configuration schemas, build time only), and markdown-it (content, build time only). No accounts and no server. The globe is drawn with primitive meshes, so the site does not depend on external 3D files.
