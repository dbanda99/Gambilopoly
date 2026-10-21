import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { localRooms } from "./scripts/local-room-plugin";
import { iceConfig } from "./src/multiplayer/iceConfig";
// Fail the build on malformed deployment settings without printing secrets.
iceConfig(process.env.VITE_ICE_SERVERS);
export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [react(), localRooms()],
  build: { chunkSizeWarningLimit: 1200 },
});
