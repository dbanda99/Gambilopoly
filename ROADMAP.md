# Gambilopoly build phases

The first milestone is local play. The overall prototype is complete only after traditional rules and real device-to-device play pass acceptance checks.

## Phase 1 — Foundation

- [x] Vite + React + TypeScript project, dependencies and build commands.
- [x] Rules types, immutable action reducer, 40-space configuration and JSON property/card data.
- [x] React Three Fiber board, selectable spaces, four tokens, camera controls and responsive HUD.
- Acceptance: production build succeeds; engine has no rendering dependencies; all 40 positions are unique.

## Phase 2 — First local playable

- [x] Set up 2–4 named players with unique tokens.
- [x] Dice, animated movement, turn validation and passing-start reward.
- [x] Purchases, ownership, rent, taxes, cash cards and transaction log.
- [x] Save and resume local snapshots.
- [x] Automated economic/rule tests, long simulated matches, and victory through bankruptcy/concession.
- Acceptance: Chrome smoke test passed for setup → roll → pass → next player, save/resume, and phone-width layout. Purchases and rent pass engine tests. Real iPhone/Android testing remains pending.

## Phase 3 — Complete traditional rules

- [x] Basic doubles, third-double jail, bail and three jail turns.
- [x] Base-rent sets, railroad/utility scaling, simplified bankruptcy and winner.
- [ ] Auctions when a property is declined; validated bidding and closing.
- [ ] Ordered/shuffled card decks, movement effects and get-out-of-jail cards.
- [x] Even building rules, house/inn bank supply, building rent and sellback.
- [ ] Mortgage/unmortgage.
- [ ] Two-party trade proposals and acceptance validation.
- [ ] Debt resolution before bankruptcy, creditor/bank procedures and auctions.
- Acceptance: scenario tests cover every rule and a full match can finish using traditional rules.

## Phase 4 — Private multiplayer

- [x] PeerJS room creation and joining with codes; unique identity/token assignment; host starts lobby.
- [x] Zod protocol validation, identity-bound actions, revision checks, host-only engine and state broadcasts.
- [x] Lobby profiles/colors, guest readiness, host kicks, bot turns and visible disconnect pause.
- [ ] Automatic reconnect and host snapshot recovery UX.
- [x] Configurable signaling/ICE servers; visible pause when host or player disconnects.
- [ ] Verify one PC + one phone, then four clients across different networks. Confirm identical state revisions, balances and ownership.
- Acceptance: four friends join, illegal/spoofed/duplicate actions are rejected, all devices agree, failures are visible. Hosting the website alone does not provide signaling or TURN.

## Phase 5 — Halloween polish and release

- [ ] Richer original models for all characters, properties and building upgrades.
- [ ] Validated custom board/deck import/export and configuration UI.
- [ ] Optional audio, reduced-motion movement and performance profiling on physical devices.
- [ ] Safari/iOS, Chrome/Android and desktop regression pass, accessibility and touch review.
- Acceptance: a complete traditional-rules multiplayer match works on actual supported devices; assets load reliably and mobile performance is acceptable.
