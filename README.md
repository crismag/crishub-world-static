# Crishub World

Crishub World is a miniature planet you explore in the browser. Countries and software projects are ordinary shores on the same globe. Spin it, lean in, and step ashore.

The first playable slice is the Interactive Globe Explorer: one rotating world with 26 named shores (countries, projects, imagined realms, and four uncharted shores), a programming continent, and a few empty islets, all in one open ocean.

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

The dev server uses port **4731**.

```bash
npm test
npm run lint
npm run build
npm run preview
```

`npm run build` writes a static site to `dist/`.

## Put it on Hostinger

The site is a static build, which fits shared hosting.

1. Run `npm run build`.
2. Open the document root for `world.crishub.com` in hPanel (the subdomain’s `public_html`).
3. Upload the **contents** of `dist/`, including `index.html` and the `assets` folder.
4. Visit the subdomain. Links like `/#singapore` work without rewrite rules, because the shore lives in the hash.

Asset paths are relative, so the same `dist/` folder also works if the site is served from a subfolder.

## The North Pole

The Beacon of Possibilities stands on the planet's north pole: an icy lighthouse with a glowing crystal crown, two compass rings, glowing ice, and a ring of aurora overhead. Hover it for its name, or click to keep the name showing. It is drawn in `src/globe/NorthPole.tsx`. No shore may stand within the clearance set in `src/data/north-pole.ts`, and the tests check that.

## The South Pole

The Vault of Mysteries lies on the opposite end of the axis: a low octagonal vault half buried in an ice crater, with a violet core and light leaking up through the ice. Around it are ice mountains, cliffs, crevasses, glowing fissures, broken pillars, frozen crystals, and light snow. Hover or click it for its name and a short line. It is drawn in `src/globe/SouthPole.tsx`, and both poles share the tooltip in `src/globe/PoleHotspot.tsx`.

## A small secret

Turn the globe to the side opposite the programming continent and look closely. The islands there are laid out in `src/data/smile.ts` as a flat map that is wrapped onto the sphere, and dressed in `src/globe/Smile.tsx`. Named shores keep clear of that side. An optional line can appear when that side faces you; set `smile.message` to turn it on. It is off by default.

## The programming continent

One wide continent faces you when the page opens. The languages and technologies are painted across its ground in large letters, readable from orbit.

The project islands sit in an even ring around it, each across a narrow strait. Every other shore is placed further out.

Edit the list in `src/data/programming.ts`. The words wrap and resize to fit on their own. Shores are placed around the rest of the globe, outside the continent.

## Add a shore

Destinations live in `src/data/destinations.ts`. Each entry needs an id, a kind (`place`, `project`, `realm`, or `mystery`), a short story, and terrain colors. Positions are scattered with a Fibonacci lattice so new shores stay apart and clear of the programming continent. They are not real-world coordinates.

A country also gets an outline in `src/data/outlines.ts`: a few points in a unit box, an anchor where the landmark stands, and a scale. Other shores get an oval with a random stretch and heading.

The land itself is built in `src/data/terrain.ts`. Ridges, snowy peaks, and hills form inland, but the ground under each landmark and under the programming lettering stays flat. The tests check that, and that every island reaches the open ocean.

Then draw the landmark in `src/globe/landmarks.tsx` by adding a branch for that id. Keep the model small, readable from above, and about the same visual weight as the others.

Uncharted shores are visible on purpose. They explain that they are not open yet. They are not puzzles and they are not a second map.

## Stack

Vite, React, TypeScript, Three.js, React Three Fiber, and shadcn/ui. No accounts and no server. The globe is drawn with primitive meshes so the site does not depend on external 3D files.
