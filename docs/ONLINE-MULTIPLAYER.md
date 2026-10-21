# Internet multiplayer setup

Everyone must create/join the match on the published URL:
https://dbanda99.github.io/Gambilopoly/

A room created by `npm run dev` is a **Local preview room** and exists only on that Vite server. It cannot be joined from GitHub Pages. Keep the host's game tab open and in the foreground while friends connect. On iPhone, open the link in Safari or another full browser, rather than a messaging app's embedded browser.

## Configure a working TURN relay

The bundled PeerJS 1.5.5 TURN names (`eu-0.turn.peerjs.com`, `us-0.turn.peerjs.com`) returned no DNS address during verification on October 21, 2026. The game now explicitly uses direct STUN connections unless a custom relay is configured. This allows local/direct tests, but does not guarantee connections across different networks. The connection-details panel reports whether a relay is configured; that label does not prove relay connectivity.

Use your own TURN service, or create a free-tier account with [Metered Open Relay](https://www.metered.ca/tools/openrelay/). Obtain its browser `iceServers` array. Include UDP plus TCP/TLS port 443 endpoints when offered. Account API keys are different from the username/password returned for TURN and must not be placed in this app's bundle or committed to Git.

1. Open the repository's **Settings → Secrets and variables → Actions → New repository secret**.
2. Name the secret `VITE_ICE_SERVERS`.
3. Paste the provider's JSON **array** of RTCIceServer entries. Entries use `urls`, `username`, and `credential`; copy the exact values supplied by the provider.
4. Run **Actions → Deploy Gambilopoly to Pages → Run workflow** on `main` (or push a new commit).
5. After deployment, refresh both devices and create a new match. Connection details should say **Relay: configured**.

The workflow now passes this secret to the Vite build. An empty secret leaves the game in direct-only mode. Malformed JSON fails the build without logging credential contents. TURN credentials used by the browser are visible to that browser; the GitHub secret only prevents committing/logging them. Prefer temporary, limited credentials. A static Pages build must be rebuilt before those credentials expire; a long-term production service should issue temporary credentials through a backend.

When the secret is present, the Pages workflow also installs Chromium and verifies a **relay-only** game (host/join and chat) before publishing. A relay that cannot actually carry game traffic will fail that workflow, preserving the previously deployed site. With no secret, that relay test is skipped; a successful direct-only deployment does not certify internet connectivity.

## Verify an actual relayed game

With Chrome and Edge installed, run in PowerShell:

```powershell
$env:GAME_TEST_URL='https://dbanda99.github.io/Gambilopoly/'
$env:TEST_WEBRTC='1'
$env:FORCE_RELAY='1'
node scripts/cross-browser-room-check.mjs
```

This forces both browsers to use TURN; direct localhost/LAN candidates cannot make the check pass. It verifies joining and chat in both host/guest directions. Run it after installing/rotating relay credentials. The same-PC direct tests alone do not verify network traversal or the friend's actual iPhone browser.

## Connection details

The expandable panel shows whether the remote description arrived, ICE state, candidate counts and numeric ICE error codes. It omits IP addresses, SDP contents and credentials. Zero relay candidates can mean no configured relay or an unavailable/misconfigured service. A missing remote description can instead mean the host did not receive/respond through signaling. Do not infer the cause from the loading label alone.
