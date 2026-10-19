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
- Validated rolls, turns, purchases, property ownership, rent, color-set base-rent doubling, railroad/utility rent, taxes, cash cards, passing start, doubles and jail.
- Simplified bankruptcy and last-player-standing victory; concede available from match options.
- Versioned browser-local snapshot saved after every accepted action; resume from setup.

This is a local alpha. Passing a purchase skips an auction. Cards currently choose cash effects randomly with replacement. Unpayable debt immediately bankrupts a player and transfers assets to the creditor or bank. No buildings, mortgages, trading, deck cycling, room codes, online synchronization, or host recovery yet. It does **not** yet satisfy the full traditional-rules or two-device multiplayer acceptance criteria.

## Architecture

`src/engine` owns all game transitions and imports only types/configuration. `applyAction(state, action, random?)` rejects illegal actions and returns a new revision without mutating the input. Tests inject randomness; runtime uses browser crypto. Rendering never generates rolls or calculates economic outcomes. `src/store.ts` connects the local controller to React and saves snapshots. `src/three` displays state and forwards property selection. Property and cash-card data live in `src/data`.

The multiplayer transport belongs in `src/multiplayer` in Phase 4: bind a connection to a player identity, validate the message schema and revision, let only the host call `applyAction`, and broadcast snapshots. Never trust a client-provided identity, dice result, money value, or state snapshot.

See [ROADMAP.md](ROADMAP.md) for milestones and acceptance gates. Official framework references: [Vite](https://vite.dev/guide/), [React Three Fiber Canvas](https://r3f.docs.pmnd.rs/api/canvas), [animation hooks](https://r3f.docs.pmnd.rs/api/hooks).
