import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "src/frontend",
  plugins: [react()],
  build: {
    outDir: "../../dist/frontend",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "^/api/": "http://127.0.0.1:3001",
    },
  },
});
