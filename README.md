# Gambilopoly

A Halloween property-trading game for 2–4 friends. React + TypeScript + React Three Fiber, with a framework-independent rules engine.

## Run locally

Use Node.js 22.14 or newer and npm:

```sh
npm install
npm run dev
```

On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`. Open the URL printed by Vite. For a phone on the same Wi-Fi, use the computer's LAN address and Vite port; create a Multiplayer room on one device and join its code on the others.

```sh
npm test
npm run build
npm run preview
```

## Current playable scope

- Single Player against 1–3 bots; private WebRTC multiplayer for 2–4 people, with code/link invitations, unique characters/colors, readiness and host kicking. Legacy local saves still resume.
- 40 selectable 3D spaces, orbit/zoom controls, angled/top camera, animated token movement, responsive HUD, and a flat-board fallback when WebGL cannot initialize.
- Gameplay fills the browser viewport. Player badges, dice, turn actions, purchase cards, camera controls, match options, history, and property inspection are overlaid on the game. Portrait phones move the player badges above the board; landscape uses a right-hand stack. Browser fullscreen is optional where supported.
- New matches begin with a skippable board tour and a close-up introduction of each token, followed by engine-validated starting rolls. Every player rolls two dice; only tied highest rollers reroll. The winner starts, then turns continue clockwise. Opening progress is saved. Existing matches resume without restarting the introduction.
- The default camera uses an angled 2.5D view. A shared presentation timeline coordinates dice reveal, eased token steps, camera approach/follow, a landing pause, and return to the overview. Manual orbit and zoom are available between sequences. Reduced-motion preferences disable cinematic camera travel and token hopping.
- Validated rolls, turns, purchases, property ownership, rent, color-set base-rent doubling, railroad/utility rent, taxes, cash cards, passing start, doubles and jail.
- Simplified bankruptcy and last-player-standing victory; concede available from match options.
- Versioned browser-local snapshot saved after every accepted action; resume from setup.

This is a playable alpha. Passing a purchase skips an auction. Cards currently choose cash effects randomly with replacement. Unpayable debt immediately bankrupts a player and transfers assets to the creditor or bank. No mortgages, trading, deck cycling, or host recovery yet. It does **not** yet satisfy the full traditional-rules or physical-device multiplayer acceptance criteria.

## Architecture

`src/engine` owns all game transitions and imports only types/configuration. `applyAction(state, action, random?)` rejects illegal actions and returns a new revision without mutating the input. Tests inject randomness; runtime uses browser crypto. Rendering never generates rolls or calculates economic outcomes. `src/store.ts` connects the local controller to React and saves snapshots. `src/three` displays state and forwards property selection. Property and cash-card data live in `src/data`.

`src/multiplayer/session.ts` hosts the engine and binds each WebRTC connection to a player. Zod validates requests; `authority.ts` checks the bound identity and revision before `applyAction`. Guests send actions and receive snapshots; they do not generate dice or economic outcomes. Duplicate request IDs are ignored. Only the host advances introductions and runs bots.

See [ROADMAP.md](ROADMAP.md) for milestones and acceptance gates. Official framework references: [Vite](https://vite.dev/guide/), [React Three Fiber Canvas](https://r3f.docs.pmnd.rs/api/canvas), [animation hooks](https://r3f.docs.pmnd.rs/api/hooks).

## Artwork and player models

Board sources live in `2d-textures`: `properties`, `corners`, and `map-center`. All 40 spaces map to these templates in `src/three/boardArtwork.ts`; names, prices and ownership remain live game data. Tile proportions match the 307 × 512 property images, with square corners. The cemetery image replaces the prototype center decorations.

The seven supplied characters are selectable for a match of up to four players. `src/data/playerAssets.json` maps persistent token IDs to the actual GLBs. Existing saves retain their token IDs. Note that `jack-olantern.glb` depicts the black cat and `sparks.glb` depicts the pumpkin character; the supplied filenames are preserved.

Original GLBs stay in `3d-models/figurines` locally. They total about 272 MB and are excluded from Git; the optimized copies in `assets/players` are tracked instead. Those web copies total about 8.5 MB. A clean checkout works with these copies even without the originals. To replace a model, put its original GLB back in `3d-models/figurines` using the catalog filename and run `npm run dev` or `npm run build`.

The predev/prebuild scripts prepare assets automatically. `scripts/prepare-models.mjs` hashes inputs, simplifies meshes, resizes textures to 1024 pixels, and applies WebP/Meshopt compression using [glTF Transform](https://gltf-transform.dev/). `scripts/sync-assets.mjs` prepares the cemetery WebP and copies the runtime assets into `public/assets`. Original artwork is preserved. Runtime files and the generated import catalog are ignored in Git and regenerated before Vite starts or builds.

Models load lazily, normalize to the board scale, and inherit the existing movement and camera sequences. A procedural token remains available while a model loads or if it fails. The supplied GLBs contain static figures, so movement uses the game's existing hop/path animation rather than embedded skeletal clips.

## Houses, inns, dice and card reveals

Open an owned property from a player badge to build or sell. A complete unmortgaged color set is required, construction and selling stay even, and four houses upgrade to an inn. The bank holds 32 houses and 12 inns. Rent follows the building count; selling returns half the construction cost.

The supplied house and inn models are optimized into assets/tabletop. The ivory die is extracted from Dice.obj without its display ground or alternate dice. Every roll throws these dice inside the board center, lets them settle, then lifts the matching result to the screen center before movement.

Chance and Community Chest draws show the supplied back artwork, flip to the matching text template, and display the engine-selected effect. Continue resolves the effect once. A pending draw is saved so resuming cannot skip or duplicate it.

## Title screen

Launch begins on black, fades in the Gambito logo and studio credit, fades back to black, then reveals the supplied title background, transparent title lettering, and menu in order. Play opens setup (including saved-game resume); Instructions and Credits open overlays. Escape or Skip intro jumps to the menu. Returning from setup opens the menu directly. Reduced-motion mode shortens fades. Title images are preloaded and converted to WebP during asset preparation; original PNGs stay unchanged.

## Game modes and networking

Play opens Single Player, Multiplayer (host), or Join a Game. Choose a name before entering. In the lobby, each human edits their own character and property color; the host can customize or remove bots, and kick guests. Guests mark Ready before the host can start. Character/color reservations are validated on the host. Single Player bots roll, buy, resolve cards, build and end turns automatically. Bot matches and old local matches can resume from the mode screen. Online snapshots are retained locally but are not offered as offline resumes.

The default transport uses PeerJS cloud signaling and WebRTC data channels. The host must remain open. A dropped participant pauses the match; automatic rejoining, host migration and recovery are not implemented. Networks that require a TURN relay need appropriate relay configuration. Website access remains separate from room invitations; visitors still need permission to open a private published site.

Connection setup has separate deadlines for signaling (25 seconds), the peer channel (45 seconds), and lobby admission (10 seconds after the channel opens). The host also waits for the channel before timing the guest's hello; heartbeats never time out a guest during ICE negotiation. The lobby shows connection progress and expandable diagnostics, distinguishing an unavailable room from signaling and WebRTC failures. Invite-copy buttons wait for signaling registration and are disabled while the host reconnects.

HTTP previews opened by local IP do not expose `crypto.randomUUID()` in current Chrome. All match, player, request and chat IDs use a cryptographic `getRandomValues()` UUID fallback on those origins. HTTPS remains preferable for physical-device tests. Same-Wi-Fi networks can still isolate devices or block WebRTC; the fallback does not bypass router/firewall restrictions. The installed PeerJS release includes default STUN and shared TURN entries; their presence is not a guarantee of relay availability.

Run `node scripts/lan-room-check.mjs` with the default Vite server on port 5174 to verify localhost-to-LAN-IP and LAN-IP-to-localhost joins and guest chat using cloud signaling. These are isolated browser contexts on one computer, not a substitute for testing the actual phone or a separate network. `src/multiplayer/session.test.ts` checks delayed channel opening, independent deadlines, host admission errors and cancelled attempts.

Optional Vite build variables: VITE_PEER_HOST, VITE_PEER_PORT, VITE_PEER_PATH and VITE_PEER_SECURE select a different signaling server; VITE_ICE_SERVERS accepts a JSON array of browser RTCIceServer entries. Values bundled with Vite are visible to browsers. Use short-lived relay credentials when supplying TURN. No environment variables are needed for the default cloud signaling service.

Verification: npm test covers rules, bots, lobby authorization, protocol validation and snapshots. For local WebRTC browser checks, run node scripts/peer-test-server.mjs, start Vite with VITE_PEER_HOST=127.0.0.1 and VITE_PEER_PORT=9000, then run node scripts/modes-check.mjs. The check defaults to port 5174; set GAME_TEST_URL to the Vite URL. This verifies isolated Chrome clients, not separate physical devices or restrictive network traversal.

## Lobby chat and game feedback

Multiplayer lobbies include text chat, with the last 60 messages available to late joiners. Messages are limited to 280 characters, rendered as plain text, and rate-limited by the host. Sender identity comes from the connection�s assigned lobby member. Chat also shows join, departure, ready and removal activity; it closes when the match starts. History stays in room memory and is cleared when the session ends.

Every money movement now has a structured transaction with the actual amount paid, payer/payee IDs and reason. Partial payments before bankruptcy animate only the amount transferred. Confirmed rent creates seven animated money-note sprites between the two players� on-screen badges after token movement, alongside signed cash deltas. Bank payments/rewards show balance deltas. Reduced-motion mode uses fades instead of flying notes.

Large event banners cover turns, payments, purchases, building changes, jail, bankruptcy and victory, with a dismiss control and activity-history shortcut. Banners pause while hovered/focused and queue recent important events; rapid building updates are combined. Duplicate snapshots and saved-game resumes do not replay effects. The source money-note PNG remains intact; prebuild produces a small WebP for the animation.

Additional browser checks: node scripts/feedback-check.mjs verifies desktop/mobile money trajectories, notification readability and cleanup on port 5174. The multiplayer modes check also verifies chat synchronization, late-join history and literal HTML text handling.
