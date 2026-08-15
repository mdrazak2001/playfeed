import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import { playfeedDevApi } from "./vite.playfeed-api.js";

export default defineConfig({
  plugins: [react(), tailwindcss(), playfeedDevApi()],
});
