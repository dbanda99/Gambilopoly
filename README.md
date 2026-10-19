# Gambilopoly

A Halloween property-trading game for 2–4 friends. React + TypeScript + React Three Fiber, with a framework-independent rules engine.

## Run locally

Use Node.js 22.14 or newer and npm:

```sh
npm install
npm run dev
```

On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`. Open the URL printed by Vite. For a phone on the same Wi-Fi, use the computer's LAN address and Vite port; this shares the app, but each device currently runs its own local match.

```sh
npm test
npm run build
npm run preview
```

## Current playable scope

- Local pass-and-play for 2–4 players, names and unique selectable tokens.
- 40 selectable 3D spaces, orbit/zoom controls, angled/top camera, animated token movement, responsive HUD, and a flat-board fallback when WebGL cannot initialize.
- Gameplay fills the browser viewport. Player badges, dice, turn actions, purchase cards, camera controls, match options, history, and property inspection are overlaid on the game. Portrait phones move the player badges above the board; landscape uses a right-hand stack. Browser fullscreen is optional where supported.
- New matches begin with a skippable board tour and a close-up introduction of each token, followed by engine-validated starting rolls. Every player rolls two dice; only tied highest rollers reroll. The winner starts, then turns continue clockwise. Opening progress is saved. Existing matches resume without restarting the introduction.
- The default camera uses an angled 2.5D view. A shared presentation timeline coordinates dice reveal, eased token steps, camera approach/follow, a landing pause, and return to the overview. Manual orbit and zoom are available between sequences. Reduced-motion preferences disable cinematic camera travel and token hopping.
- Validated rolls, turns, purchases, property ownership, rent, color-set base-rent doubling, railroad/utility rent, taxes, cash cards, passing start, doubles and jail.
- Simplified bankruptcy and last-player-standing victory; concede available from match options.
- Versioned browser-local snapshot saved after every accepted action; resume from setup.

This is a local alpha. Passing a purchase skips an auction. Cards currently choose cash effects randomly with replacement. Unpayable debt immediately bankrupts a player and transfers assets to the creditor or bank. No buildings, mortgages, trading, deck cycling, room codes, online synchronization, or host recovery yet. It does **not** yet satisfy the full traditional-rules or two-device multiplayer acceptance criteria.

## Architecture

`src/engine` owns all game transitions and imports only types/configuration. `applyAction(state, action, random?)` rejects illegal actions and returns a new revision without mutating the input. Tests inject randomness; runtime uses browser crypto. Rendering never generates rolls or calculates economic outcomes. `src/store.ts` connects the local controller to React and saves snapshots. `src/three` displays state and forwards property selection. Property and cash-card data live in `src/data`.

The multiplayer transport belongs in `src/multiplayer` in Phase 4: bind a connection to a player identity, validate the message schema and revision, let only the host call `applyAction`, and broadcast snapshots. Never trust a client-provided identity, dice result, money value, or state snapshot.

See [ROADMAP.md](ROADMAP.md) for milestones and acceptance gates. Official framework references: [Vite](https://vite.dev/guide/), [React Three Fiber Canvas](https://r3f.docs.pmnd.rs/api/canvas), [animation hooks](https://r3f.docs.pmnd.rs/api/hooks).

## Artwork and player models

Board sources live in `2d-textures`: `properties`, `corners`, and `map-center`. All 40 spaces map to these templates in `src/three/boardArtwork.ts`; names, prices and ownership remain live game data. Tile proportions match the 307 × 512 property images, with square corners. The cemetery image replaces the prototype center decorations.

The seven supplied characters are selectable for a match of up to four players. `src/data/playerAssets.json` maps persistent token IDs to the actual GLBs. Existing saves retain their token IDs. Note that `jack-olantern.glb` depicts the black cat and `sparks.glb` depicts the pumpkin character; the supplied filenames are preserved.

Original GLBs stay in `3d-models/figurines` locally. They total about 272 MB and are excluded from Git; the optimized copies in `assets/players` are tracked instead. Those web copies total about 8.5 MB. A clean checkout works with these copies even without the originals. To replace a model, put its original GLB back in `3d-models/figurines` using the catalog filename and run `npm run dev` or `npm run build`.

The predev/prebuild scripts prepare assets automatically. `scripts/prepare-models.mjs` hashes inputs, simplifies meshes, resizes textures to 1024 pixels, and applies WebP/Meshopt compression using [glTF Transform](https://gltf-transform.dev/). `scripts/sync-assets.mjs` prepares the cemetery WebP and copies the runtime assets into `public/assets`. Original artwork is preserved. Runtime files and the generated import catalog are ignored in Git and regenerated before Vite starts or builds.

Models load lazily, normalize to the board scale, and inherit the existing movement and camera sequences. A procedural token remains available while a model loads or if it fails. The supplied GLBs contain static figures, so movement uses the game's existing hop/path animation rather than embedded skeletal clips.
