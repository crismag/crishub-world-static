# Crishub World

Crishub World is a miniature planet you explore in the browser. Countries and software projects are ordinary shores on the same globe. Spin it, lean in, and step ashore.

The first playable slice is the Interactive Globe Explorer: one rotating world, eighteen named destinations, a few empty islets, and three shores that are still uncharted.

## Wander

- Drag the globe to turn it. A short flick keeps it coasting.
- After a quiet moment, the planet turns on its own. Choosing a shore holds it still.
- Scroll, pinch, or use the zoom buttons to lean closer.
- Click a landmark, or pick a name from the list. The list is a shortcut. The world is the menu.
- Arrow keys turn the globe. `+` and `-` zoom. Escape leaves the shore you are reading.
- A selected shore can be shared with its hash, for example `#japan` or `#crislab`.

Places, project worlds, and uncharted shores are the same size on purpose. Empty ocean is left open for later countries, projects, and surprises.

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

## Add a shore

Destinations live in `src/data/destinations.ts`. Each entry needs an id, a kind (`place`, `project`, or `mystery`), a short story, and terrain colors. Positions are scattered with a Fibonacci lattice so new shores stay apart. They are not real-world coordinates.

Then draw the landmark in `src/globe/landmarks.tsx` by adding a branch for that id. Keep the model small, readable from above, and about the same visual weight as the others.

Uncharted shores are visible on purpose. They explain that they are not open yet. They are not puzzles and they are not a second map.

## Stack

Vite, React, TypeScript, Three.js, React Three Fiber, and shadcn/ui. No accounts and no server. The globe is drawn with primitive meshes so the site does not depend on external 3D files.
