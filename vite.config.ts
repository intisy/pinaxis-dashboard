import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // sql.js ships a WASM binary that must not be pre-bundled by esbuild.
  optimizeDeps: { exclude: ["sql.js"] },
});
