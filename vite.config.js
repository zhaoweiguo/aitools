import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      input: {
        portal: resolve(process.cwd(), "index.html"),
        entry: resolve(process.cwd(), "entry/index.html"),
        atifView: resolve(process.cwd(), "atif-view/index.html"),
        jsonView: resolve(process.cwd(), "json-view/index.html"),
        markdownView: resolve(process.cwd(), "markdown-view/index.html"),
      },
    },
  },
});
