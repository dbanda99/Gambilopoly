import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { localRooms } from "./scripts/local-room-plugin";
export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [react(), localRooms()],
  build: { chunkSizeWarningLimit: 1200 },
});
